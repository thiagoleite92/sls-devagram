import { APIGatewayEvent, Handler } from 'aws-lambda';
import { CognitoServices } from '../services/CognitoServices';
import { LoginRequest } from '../types/login/LoginRequest';
import { validateEnvs } from '../utils/environmentsUtils';
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from '../utils/formatResponseUtil';
import { logger } from '../utils/loggerUtils';

export const handler: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs([
      'USER_POOL_ID',
      'USER_POOL_CLIENT_ID',
    ]);

    if (error) {
      logger.error('login.handler - ', error);
      return formatDefaultResponse(500, error);
    }

    if (!event.body) {
      return formatDefaultResponse(400, 'Parametros de entrada inválidos.');
    }

    const request = JSON.parse(event.body);

    const { login, password } = request as LoginRequest;

    if (!login || !password) {
      return formatDefaultResponse(400, 'Parametros de entrada inválidos.');
    }

    logger.info('login.handler - start', login);

    const result = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).login(login, password);

    logger.debug('login.handler - cognito response', result);
    logger.info('login.handler - finish', login);

    return formatDefaultResponse(200, undefined, result);
  } catch (error) {
    logger.error('login.handler - Error on request forgot password: ', error);
    return formatDefaultResponse(
      500,
      'Erro realizar autenticacão de usuário! Tente novamente ou contacte o administrador do sistema.'
    );
  }
};
