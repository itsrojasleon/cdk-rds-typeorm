import { DataSource } from 'typeorm';
import { User } from './models/user';
import { getDatatabaseCredentials } from './utils';

export const getDataSource = async () => {
  if (!process.env.DB_SECRET_NAME) {
    throw new Error('DB_SECRET_NAME must be defined');
  }
  if (!process.env.DB_NAME) {
    throw new Error('DB_NAME must be defined');
  }
  if (!process.env.DB_HOST) {
    throw new Error('DB_HOST must be defined');
  }

  const { dbUsername, dbPassword } = await getDatatabaseCredentials(
    process.env.DB_SECRET_NAME
  );
  console.log('dbUsername', dbUsername);
  console.log('dbPassword', dbPassword);

  return new DataSource({
    type: 'postgres',
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    username: dbUsername,
    password: dbPassword,
    port: 5432,
    ssl: true,
    logging: true,
    entities: [User],
    synchronize: true
    // migrationsRun: false,
    // migrations: ['src/migrations/*.ts']
  });
};
