import { APIGatewayEvent, Handler } from 'aws-lambda';
import { CognitoServices } from '../services/CognitoServices';
import { LoginRequest } from '../types/login/LoginRequest';
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from '../utils/formatResponseUtil';

export const handler: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;

    if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
      return formatDefaultResponse(
        500,
        'ENVs do Cognito não encontradas! Por favor, avise ao administrador do sistema.'
      );
    }

    if (!event.body) {
      return formatDefaultResponse(400, 'Parametros de entrada inválidos.');
    }

    const request = JSON.parse(event.body);

    const { login, password } = request as LoginRequest;

    if (!login || !password) {
      return formatDefaultResponse(400, 'Parametros de entrada inválidos.');
    }

    const result = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).login(login, password);

    return formatDefaultResponse(200, undefined, result);
  } catch (error) {
    console.log('Error on request forgot password: ', error);
    return formatDefaultResponse(
      500,
      'Erro realizar autenticacão de usuário! Tente novamente ou contacte o administrador do sistema.'
    );
  }
};
