import { SigningStargateClient } from '@cosmjs/stargate';
import { cosmos } from '@manifest-network/manifestjs';
import { ManifestMCPError, ManifestMCPErrorCode, CosmosTxResult, ManifestMCPConfig } from '../types.js';
import { parseAmount, buildTxResult, parseBigInt, validateArgsLength } from './utils.js';

const { MsgVote, MsgDeposit, MsgVoteWeighted } = cosmos.gov.v1;

/**
 * Parse vote option string to vote option enum value
 */
function parseVoteOption(optionStr: string): number {
  const option = optionStr.toLowerCase();
  switch (option) {
    case 'yes':
    case '1':
      return 1; // VOTE_OPTION_YES
    case 'abstain':
    case '2':
      return 2; // VOTE_OPTION_ABSTAIN
    case 'no':
    case '3':
      return 3; // VOTE_OPTION_NO
    case 'no_with_veto':
    case 'nowithveto':
    case '4':
      return 4; // VOTE_OPTION_NO_WITH_VETO
    default:
      throw new ManifestMCPError(
        ManifestMCPErrorCode.TX_FAILED,
        `Invalid vote option: ${optionStr}. Expected: yes, no, abstain, or no_with_veto`
      );
  }
}

/**
 * Route gov transaction to appropriate handler
 */
export async function routeGovTransaction(
  client: SigningStargateClient,
  senderAddress: string,
  subcommand: string,
  args: string[],
  _config: ManifestMCPConfig,
  waitForConfirmation: boolean
): Promise<CosmosTxResult> {
  validateArgsLength(args, 'gov transaction');

  switch (subcommand) {
    case 'vote': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'vote requires proposal-id and option arguments'
        );
      }

      const [proposalIdStr, optionStr] = args;
      const proposalId = parseBigInt(proposalIdStr, 'proposal-id');
      const option = parseVoteOption(optionStr);

      // Extract optional metadata from args
      let metadata = '';
      const metadataIndex = args.indexOf('--metadata');
      if (metadataIndex !== -1 && args[metadataIndex + 1]) {
        metadata = args[metadataIndex + 1];
      }

      const msg = {
        typeUrl: '/cosmos.gov.v1.MsgVote',
        value: MsgVote.fromPartial({
          proposalId,
          voter: senderAddress,
          option,
          metadata,
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('gov', 'vote', result, waitForConfirmation);
    }

    case 'weighted-vote': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'weighted-vote requires proposal-id and options arguments (format: yes=0.5,no=0.5)'
        );
      }

      const [proposalIdStr, optionsStr] = args;
      const proposalId = parseBigInt(proposalIdStr, 'proposal-id');

      // Parse weighted options (format: yes=0.5,no=0.3,abstain=0.2)
      const options = optionsStr.split(',').map((opt) => {
        const [optName, weightStr] = opt.split('=');
        if (!optName || !weightStr) {
          throw new ManifestMCPError(
            ManifestMCPErrorCode.TX_FAILED,
            `Invalid weighted vote format: ${opt}. Expected format: option=weight`
          );
        }
        const option = parseVoteOption(optName);
        // Weight is a decimal string (e.g., "0.5" -> "500000000000000000" for 18 decimals)
        const weight = (parseFloat(weightStr) * 1e18).toFixed(0);
        return { option, weight };
      });

      const msg = {
        typeUrl: '/cosmos.gov.v1.MsgVoteWeighted',
        value: MsgVoteWeighted.fromPartial({
          proposalId,
          voter: senderAddress,
          options,
          metadata: '',
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('gov', 'weighted-vote', result, waitForConfirmation);
    }

    case 'deposit': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.TX_FAILED,
          'deposit requires proposal-id and amount arguments'
        );
      }

      const [proposalIdStr, amountStr] = args;
      const proposalId = parseBigInt(proposalIdStr, 'proposal-id');
      const { amount, denom } = parseAmount(amountStr);

      const msg = {
        typeUrl: '/cosmos.gov.v1.MsgDeposit',
        value: MsgDeposit.fromPartial({
          proposalId,
          depositor: senderAddress,
          amount: [{ denom, amount }],
        }),
      };

      const result = await client.signAndBroadcast(senderAddress, [msg], 'auto');
      return buildTxResult('gov', 'deposit', result, waitForConfirmation);
    }

    default:
      throw new ManifestMCPError(
        ManifestMCPErrorCode.UNSUPPORTED_TX,
        `Unsupported gov transaction subcommand: ${subcommand}`,
        { availableSubcommands: ['vote', 'weighted-vote', 'deposit'] }
      );
  }
}
