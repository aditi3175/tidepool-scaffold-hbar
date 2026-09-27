import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const HTS = "0x0000000000000000000000000000000000000167";
const EXCHANGE_RATE = "0x0000000000000000000000000000000000000168";
// tinycentsToTinybars(500_000_000) with the mock rate, plus SaucerSwap's 1-tinybar slop.
const MINT_FEE = (500_000_000n * 100n) / 780n + 1n;

async function etch(address: string, contractName: string) {
  const impl = await (await ethers.getContractFactory(contractName)).deploy();
  const code = await ethers.provider.getCode(await impl.getAddress());
  await network.provider.send("hardhat_setCode", [address, code]);
}

async function deployFixture() {
  const [deployer, alice, bob, keeper] = await ethers.getSigners();
  await etch(HTS, "MockHts");
  await etch(EXCHANGE_RATE, "MockExchangeRate");

  const Token = await ethers.getContractFactory("MockToken");
  // Order the pair like SaucerSwap does: token0 has the lower address.
  const a = await Token.deploy("Wrapped HBAR", "WHBAR", 8);
  const b = await Token.deploy("Sauce", "SAUCE", 6);
  const [t0, t1] = BigInt(await a.getAddress()) < BigInt(await b.getAddress()) ? [a, b] : [b, a];

  const pool = await (await ethers.getContractFactory("MockPool")).deploy(await t0.getAddress(), await t1.getAddress());
  await pool.setPrice(-7680, -7680);
  const factory = await (await ethers.getContractFactory("MockFactory")).deploy();
  await factory.setPool(await t0.getAddress(), await t1.getAddress(), 3000, await pool.getAddress());
  const npm = await (
    await ethers.getContractFactory("MockPositionManager")
  ).deploy(await factory.getAddress(), await pool.getAddress(), MINT_FEE);
  const router = await (
    await ethers.getContractFactory("MockSwapRouter")
  ).deploy(await factory.getAddress(), await pool.getAddress());

  const vault = await (
    await ethers.getContractFactory("TidepoolVault")
  ).deploy({
    pool: await pool.getAddress(),
    positionManager: await npm.getAddress(),
    swapRouter: await router.getAddress(),
    halfWidth: 600,
    twapWindow: 600,
    maxTwapDeviation: 100,
    rebalanceCooldown: 3600,
    swapSlippageBps: 100,
  });
  await vault.initialize("Tidepool WHBAR-SAUCE", "tpWS", { value: ethers.parseEther("1") });
  const share = await ethers.getContractAt("MockToken", await vault.shareToken());

  for (const user of [alice, bob]) {
    await t0.mint(user.address, 10n ** 30n);
    await t1.mint(user.address, 10n ** 30n);
    await t0.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    await t1.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    await share.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  }
  return { deployer, alice, bob, keeper, t0, t1, pool, npm, router, vault, share };
}

describe("TidepoolVault", function () {
  describe("setup", function () {
    it("rejects a pool the factory does not know", async function () {
      const { npm, router } = await loadFixture(deployFixture);
      const other = await (
        await ethers.getContractFactory("MockPool")
      ).deploy(ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address);
      await expect(
        (await ethers.getContractFactory("TidepoolVault")).deploy({
          pool: await other.getAddress(),
          positionManager: await npm.getAddress(),
          swapRouter: await router.getAddress(),
          halfWidth: 600,
          twapWindow: 600,
          maxTwapDeviation: 100,
          rebalanceCooldown: 3600,
          swapSlippageBps: 100,
        }),
      ).to.be.revertedWithCustomError(await ethers.getContractFactory("TidepoolVault"), "InvalidConfig");
    });

    it("only lets the deployer initialize, once", async function () {
      const { vault, alice } = await loadFixture(deployFixture);
      await expect(vault.connect(alice).initialize("x", "y", { value: 1 })).to.be.revertedWithCustomError(
        vault,
        "NotDeployer",
      );
      await expect(vault.initialize("x", "y", { value: 1 })).to.be.revertedWithCustomError(vault, "AlreadyInitialized");
    });
  });

  describe("deposit and compound", function () {
    it("mints initial shares minus dead shares on the first deposit", async function () {
      const { vault, share, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      expect(await share.balanceOf(alice.address)).to.equal(
        (await vault.INITIAL_SHARES()) - (await vault.DEAD_SHARES()),
      );
      expect(await vault.totalShares()).to.equal(await vault.INITIAL_SHARES());
    });

    it("compound mints the first position centred on the TWAP tick and refunds spare HBAR", async function () {
      const { vault, alice, keeper, npm } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      const before = await ethers.provider.getBalance(keeper.address);
      const tx = await vault.connect(keeper).compound({ value: MINT_FEE * 3n });
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      expect(before - (await ethers.provider.getBalance(keeper.address)) - gas).to.equal(MINT_FEE);
      expect(await vault.positionSerial()).to.equal(1n);
      expect(await vault.tickLower()).to.equal(-7680 - 600);
      expect(await vault.tickUpper()).to.equal(-7680 + 600);
      const [, , , , , liquidity] = await npm.positions(1);
      expect(liquidity).to.be.greaterThan(0n);
    });

    it("reverts compound when msg.value is below the position fee", async function () {
      const { vault, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await expect(vault.compound({ value: MINT_FEE - 1n })).to.be.revertedWithCustomError(vault, "InsufficientFee");
    });

    it("prices later deposits pro rata, so a second depositor cannot dilute the first", async function () {
      const { vault, share, alice, bob } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const [total0, total1] = await vault.getTotalAmounts();
      await vault.connect(bob).deposit(total0, total1, 0, bob.address); // double the vault
      const supply = await vault.totalShares();
      expect(await share.balanceOf(bob.address)).to.be.closeTo(supply / 2n, supply / 1_000_000n);
    });

    it("refuses deposits while spot is far from the TWAP", async function () {
      const { vault, pool, alice } = await loadFixture(deployFixture);
      await pool.setPrice(-7680 + 500, -7680);
      await expect(vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address)).to.be.revertedWithCustomError(
        vault,
        "PriceDeviation",
      );
    });

    it("surfaces an unusable pool oracle as TwapUnavailable", async function () {
      const { vault, pool, alice } = await loadFixture(deployFixture);
      await pool.setObserveReverts(true);
      await expect(vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address)).to.be.revertedWithCustomError(
        vault,
        "TwapUnavailable",
      );
    });

    it("refuses a first compound when the vault holds nothing", async function () {
      const { vault } = await loadFixture(deployFixture);
      await expect(vault.compound({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "NothingToCompound");
    });

    it("grants standing manager and router allowances once, so compound works twice without re-approving", async function () {
      const { vault, t0, t1, npm, router, alice, bob } = await loadFixture(deployFixture);
      const standing = 2n ** 63n - 1n; // type(int64).max
      for (const token of [t0, t1]) {
        expect(await token.allowance(await vault.getAddress(), await npm.getAddress())).to.equal(standing);
        expect(await token.allowance(await vault.getAddress(), await router.getAddress())).to.equal(standing);
      }
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const [, , , , , liqBefore] = await npm.positions(1);

      await vault.connect(bob).deposit(10n ** 10n, 10n ** 9n, 0, bob.address);
      const tx = vault.compound({ value: MINT_FEE });
      await expect(tx).to.emit(vault, "Compound");
      await expect(tx).to.not.emit(t0, "Approval");
      await expect(tx).to.not.emit(t1, "Approval");
      const [, , , , , liqAfter] = await npm.positions(1);
      expect(liqAfter).to.be.greaterThan(liqBefore);
    });

    it("refuses to compound into a position whose range no longer contains the TWAP", async function () {
      const { vault, pool, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      await pool.setPrice(-7680 + 900, -7680 + 900);
      await expect(vault.compound({ value: MINT_FEE }))
        .to.be.revertedWithCustomError(vault, "OutOfRange")
        .withArgs(-7680 + 900);
    });

    it("makes a share-price inflation attack unprofitable", async function () {
      const { vault, share, t0, t1, alice, bob } = await loadFixture(deployFixture);
      // Attacker (alice) deposits dust, then donates a large amount directly to the vault.
      await vault.connect(alice).deposit(1n, 1n, 0, alice.address);
      await t0.connect(alice).transfer(await vault.getAddress(), 10n ** 12n);
      await t1.connect(alice).transfer(await vault.getAddress(), 10n ** 11n);
      // Victim deposits the same scale; the fixed 1e10 initial shares keep rounding loss negligible.
      await vault.connect(bob).deposit(10n ** 12n, 10n ** 11n, 1, bob.address);
      const supply = await vault.totalShares();
      expect(await share.balanceOf(bob.address)).to.be.closeTo(supply / 2n, supply / 1_000_000n);
    });
  });

  describe("fees", function () {
    it("collects fees and compounds them into the position", async function () {
      const { vault, npm, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const [, , , , , liqBefore] = await npm.positions(1);
      await npm.accrueFees(1, 10n ** 8n, 10n ** 7n);
      await expect(vault.compound({ value: MINT_FEE }))
        .to.emit(vault, "FeesCollected")
        .withArgs(10n ** 8n, 10n ** 7n);
      const [, , , , , liqAfter] = await npm.positions(1);
      expect(liqAfter).to.be.greaterThan(liqBefore);
    });
  });

  describe("withdraw", function () {
    it("returns the pro-rata slice of position and idle balances and burns the shares", async function () {
      const { vault, share, t0, t1, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      const shares = await share.balanceOf(alice.address);
      const [total0, total1] = await vault.getTotalAmounts();
      const b0 = await t0.balanceOf(alice.address);
      const b1 = await t1.balanceOf(alice.address);

      await vault.connect(alice).withdraw(shares, 0, 0, alice.address);

      const supply = shares + (await vault.DEAD_SHARES());
      expect((await t0.balanceOf(alice.address)) - b0).to.be.closeTo((total0 * shares) / supply, 10n);
      expect((await t1.balanceOf(alice.address)) - b1).to.be.closeTo((total1 * shares) / supply, 10n);
      expect(await vault.totalShares()).to.equal(await vault.DEAD_SHARES());
      expect(await share.balanceOf(alice.address)).to.equal(0n);
    });

    it("enforces the caller's minimum amounts", async function () {
      const { vault, share, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      const shares = await share.balanceOf(alice.address);
      await expect(vault.connect(alice).withdraw(shares, 10n ** 20n, 0, alice.address)).to.be.revertedWithCustomError(
        vault,
        "SlippageExceeded",
      );
    });

    it("still works when the TWAP guard would block deposits", async function () {
      const { vault, share, pool, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(10n ** 10n, 10n ** 9n, 0, alice.address);
      await vault.compound({ value: MINT_FEE });
      await pool.setPrice(-7680 + 500, -7680);
      await expect(vault.connect(alice).withdraw(await share.balanceOf(alice.address), 0, 0, alice.address)).to.not.be
        .reverted;
    });
  });

  describe("rebalance", function () {
    async function withPosition() {
      const f = await loadFixture(deployFixture);
      await f.vault.connect(f.alice).deposit(10n ** 10n, 10n ** 9n, 0, f.alice.address);
      await f.vault.compound({ value: MINT_FEE });
      return f;
    }

    it("refuses while the TWAP tick is still in range", async function () {
      const { vault } = await withPosition();
      await time.increase(3601);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "StillInRange");
    });

    it("refuses during the cooldown", async function () {
      const { vault, pool } = await withPosition();
      await pool.setPrice(-7680 + 900, -7680 + 900);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "CooldownActive");
    });

    it("refuses when spot has been pushed away from the TWAP (sandwich guard)", async function () {
      const { vault, pool } = await withPosition();
      await time.increase(3601);
      await pool.setPrice(-7680 + 2000, -7680 + 900);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "PriceDeviation");
    });

    it("surfaces an unusable pool oracle as TwapUnavailable", async function () {
      const { vault, pool } = await withPosition();
      await time.increase(3601);
      await pool.setObserveReverts(true);
      await expect(vault.rebalance({ value: MINT_FEE })).to.be.revertedWithCustomError(vault, "TwapUnavailable");
    });

    it("re-centres on the TWAP tick with a new position and keeps value", async function () {
      const { vault, pool, npm } = await withPosition();
      await time.increase(3601);
      await pool.setPrice(-7680 + 900, -7680 + 900);
      const [v0, v1] = await vault.getTotalAmounts();

      await expect(vault.rebalance({ value: MINT_FEE })).to.emit(vault, "Rebalance");

      expect(await vault.positionSerial()).to.equal(2n);
      expect(await vault.tickLower()).to.equal(-7680 + 900 - 600);
      expect(await vault.tickUpper()).to.equal(-7680 + 900 + 600);
      const [, , , , , oldLiquidity] = await npm.positions(1);
      expect(oldLiquidity).to.equal(0n);

      // Value in token1 terms may only drop by the swap fee on the rebalanced slice (0.3%).
      const [a0, a1] = await vault.getTotalAmounts();
      const sqrtP = (await pool.slot0())[0];
      const toT1 = (x: bigint) => (((x * sqrtP) >> 96n) * sqrtP) >> 96n;
      const before = toT1(v0) + v1;
      const after = toT1(a0) + a1;
      expect(after).to.be.greaterThanOrEqual((before * 997n) / 1000n);
    });
  });
});
