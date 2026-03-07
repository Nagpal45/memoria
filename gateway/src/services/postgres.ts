import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

//local dev
// const pool = new Pool({
//     user: process.env.POSTGRES_USER || 'postgres',
//     host: process.env.POSTGRES_HOST || 'localhost',
//     database: process.env.POSTGRES_NAME || 'postgres',
//     password: process.env.POSTGRES_PASSWORD || 'password',
//     port: parseInt(process.env.POSTGRES_PORT || '5432'),
// });

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