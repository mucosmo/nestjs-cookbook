import { registerAs } from '@nestjs/config';

import { ConfigEnum } from '../constants/config.constant';
import { getEnv, getEnvNumeric } from '../utils/env.util';

export interface IMongoConfig {
  uri: string;
}

export default registerAs(ConfigEnum.MONGO, () => {
  const user = getEnv('MONGO_USER');
  const password = getEnv('MONGO_PASSWORD');
  const host = getEnv('MONGO_HOST');
  const port = getEnvNumeric('MONGO_PORT');
  const database = getEnv('MONGO_DATABASE');
  const authDb = getEnv('MONGO_AUTHDB', 'admin');

  return {
    uri: `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=${authDb}`,
  };
});
