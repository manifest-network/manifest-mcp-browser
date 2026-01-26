import { ManifestQueryClient } from '../client.js';
import { ManifestMCPError, ManifestMCPErrorCode } from '../types.js';
import { parseBigInt, parseInt, defaultPagination } from './utils.js';

/**
 * Route gov query to manifestjs query client
 */
export async function routeGovQuery(
  queryClient: ManifestQueryClient,
  subcommand: string,
  args: string[]
): Promise<Record<string, unknown>> {
  const gov = queryClient.cosmos.gov.v1;

  switch (subcommand) {
    case 'proposal': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'proposal requires proposal-id argument'
        );
      }
      const proposalId = parseBigInt(args[0], 'proposal-id');
      const result = await gov.proposal({ proposalId });
      return { proposal: result.proposal };
    }

    case 'proposals': {
      // Parse optional status filter
      const proposalStatus = args[0] ? parseInt(args[0], 'status') : 0;
      const voter = args[1] || '';
      const depositor = args[2] || '';
      const result = await gov.proposals({ proposalStatus, voter, depositor, pagination: defaultPagination });
      return { proposals: result.proposals, pagination: result.pagination };
    }

    case 'vote': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'vote requires proposal-id and voter-address arguments'
        );
      }
      const proposalId = parseBigInt(args[0], 'proposal-id');
      const voter = args[1];
      const result = await gov.vote({ proposalId, voter });
      return { vote: result.vote };
    }

    case 'votes': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'votes requires proposal-id argument'
        );
      }
      const proposalId = parseBigInt(args[0], 'proposal-id');
      const result = await gov.votes({ proposalId, pagination: defaultPagination });
      return { votes: result.votes, pagination: result.pagination };
    }

    case 'deposit': {
      if (args.length < 2) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'deposit requires proposal-id and depositor-address arguments'
        );
      }
      const proposalId = parseBigInt(args[0], 'proposal-id');
      const depositor = args[1];
      const result = await gov.deposit({ proposalId, depositor });
      return { deposit: result.deposit };
    }

    case 'deposits': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'deposits requires proposal-id argument'
        );
      }
      const proposalId = parseBigInt(args[0], 'proposal-id');
      const result = await gov.deposits({ proposalId, pagination: defaultPagination });
      return { deposits: result.deposits, pagination: result.pagination };
    }

    case 'tally': {
      if (args.length < 1) {
        throw new ManifestMCPError(
          ManifestMCPErrorCode.QUERY_FAILED,
          'tally requires proposal-id argument'
        );
      }
      const proposalId = parseBigInt(args[0], 'proposal-id');
      const result = await gov.tallyResult({ proposalId });
      return { tally: result.tally };
    }

    case 'params': {
      const paramsType = args[0] || 'tallying';
      const result = await gov.params({ paramsType });
      return {
        votingParams: result.votingParams,
        depositParams: result.depositParams,
        tallyParams: result.tallyParams,
        params: result.params,
      };
    }

    default:
      throw new ManifestMCPError(
        ManifestMCPErrorCode.UNSUPPORTED_QUERY,
        `Unsupported gov query subcommand: ${subcommand}`,
        {
          availableSubcommands: [
            'proposal',
            'proposals',
            'vote',
            'votes',
            'deposit',
            'deposits',
            'tally',
            'params',
          ],
        }
      );
  }
}
