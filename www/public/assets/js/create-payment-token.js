// Contoh Node.js (Vercel Serverless Function)
const midtransClient = require('midtrans-client');

// Inisialisasi Snap client menggunakan Server Key rahasia Anda
let snap = new midtransClient.Snap({
    isProduction: false, // Ubah ke true saat sudah rilis ke publik
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405.json({ error: 'Method not allowed' }));
    }

    try {
        const { order_id, gross_amount, customer_details } = req.body;

        let parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: gross_amount
            },
            customer_details: customer_details
        };

        const transaction = await snap.createTransaction(parameter);
        return res.status(200).json({ token: transaction.token });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}