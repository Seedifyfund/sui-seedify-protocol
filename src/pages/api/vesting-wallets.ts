import { NextApiRequest, NextApiResponse } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

const endpoint = 'https://sui-api.yourprovider.com/graphql'; // Use the correct endpoint for your GraphQL service
const graphQLClient = new GraphQLClient(endpoint);

const query = gql`
  query {
    objects(filter: { type: "0x4afa11807187e5c657ffba3b552fdbb546d6e496ee5591dca919c99dd48d3f27::torqueprotocol::Wallet" }) {
      data {
        id
        owner {
          address
        }
        type
        fields {
          balance
          released
          duration
          claim_interval
          last_claimed
          start
        }
      }
    }
  }
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const data = await graphQLClient.request(query) as { objects: { data: unknown } };
        res.status(200).json(data.objects.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vesting wallets' });
    }
}
