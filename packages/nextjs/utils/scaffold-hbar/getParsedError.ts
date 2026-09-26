import { BaseError as BaseViemError, ContractFunctionRevertedError } from "viem";
import { CANCELLED_MESSAGE, customErrorMessage, isUserRejection } from "~~/utils/tidepool/errors";

/**
 * Parses an viem/wagmi error to get a displayable string
 * @param e - error object
 * @returns parsed error string
 */
export const getParsedError = (error: any): string => {
  // Tidepool: a wallet rejection is not an error.
  if (isUserRejection(error)) return CANCELLED_MESSAGE;
  const parsedError = error?.walk ? error.walk() : error;

  if (parsedError instanceof BaseViemError) {
    if (parsedError.details) {
      return parsedError.details;
    }

    if (parsedError.shortMessage) {
      if (
        parsedError instanceof ContractFunctionRevertedError &&
        parsedError.data &&
        parsedError.data.errorName !== "Error"
      ) {
        // Tidepool: plain-language text for the vault's custom errors.
        const friendly = customErrorMessage(parsedError.data.errorName, parsedError.data.args ?? []);
        if (friendly) return friendly;
        const customErrorArgs = parsedError.data.args?.toString() ?? "";
        return `${parsedError.shortMessage.replace(/reverted\.$/, "reverted with the following reason:")}\n${
          parsedError.data.errorName
        }(${customErrorArgs})`;
      }

      return parsedError.shortMessage;
    }

    return parsedError.message ?? parsedError.name ?? "An unknown error occurred";
  }

  return parsedError?.message ?? "An unknown error occurred";
};
