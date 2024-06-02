import nextCors from 'nextjs-cors';

export default async function handler(req, res) {
    // Apply the cors middleware
    await nextCors(req, res, {
        // Options
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        origin: '*', // Replace with your allowed origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    });

    // Your API Route handler logic goes here
    if (req.method === 'GET') {
        res.status(200).json({ message: 'Hello World!' });
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
}