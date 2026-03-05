import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT),
});

export const initDB = async () => {
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS semantic_cache (
                id SERIAL PRIMARY KEY,
                prompt TEXT NOT NULL,
                embedding vector(384),
                response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS semantic_cache_embedding_idx 
            ON semantic_cache USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        `);

        console.log('Connected to PostgreSQL & pgvector initialized!');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
};

export default pool;