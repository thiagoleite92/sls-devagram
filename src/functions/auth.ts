import { UserModel } from './../models/UserModel';
import { User } from './../types/models/User';
import { CognitoServices } from './../services/CognitoServices';
import { UserRegisterRequest } from './../types/auth/UserRegisterRequest';
import type { Handler, APIGatewayEvent } from 'aws-lambda';
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from '../utils/formatResponseUtil';
import { emailRegex, passwordRegex } from '../constants/Regexes';
import { ConfirEmailRequest } from '../types/auth/ConfirmEmailRequest';

export const register: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID, USER_TABLE } = process.env;

    if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
      return formatDefaultResponse(
        500,
        'ENVs do Cognito não encontradas! Por favor, avise ao administrador do sistema.'
      );
    }

    if (!USER_TABLE) {
      return formatDefaultResponse(
        500,
        'ENV da tabela de usuário do dynamo não encontrada! Por favor, avise ao administrador do sistema.'
      );
    }

    if (!event.body) {
      return formatDefaultResponse(400, 'Parametros de entrada inválidos.');
    }

    const request = JSON.parse(event.body) as UserRegisterRequest;

    const { name, password, email } = request;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, 'Email inválido.');
    }

    if (!password || !password.match(passwordRegex)) {
      return formatDefaultResponse(400, 'Senha inválido.');
    }

    if (!name || name.trim().length < 2) {
      return formatDefaultResponse(400, 'Nome inválido.');
    }

    const cognitoUser = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).signUp(email, password);

    const user = { name, email, cognitoId: cognitoUser.userSub } as User;

    await UserModel.create(user);

    return formatDefaultResponse(200, 'Usuário cadastrado com sucesso!');
  } catch (error) {
    console.log('Error on register user: ', error);
    return formatDefaultResponse(
      500,
      'Erro ao cadastrar usuário! Tente novamente ou contacte o administrador do sistema.'
    );
  }
};

export const confirmEmail: Handler = async (
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

    const request = JSON.parse(event.body) as ConfirEmailRequest;

    const { email, verificationCode } = request;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, 'Email inválido.');
    }

    if (!verificationCode || verificationCode.length !== 6) {
      return formatDefaultResponse(400, 'Código inválido');
    }

    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).confirmEmail(
      email,
      verificationCode
    );

    return formatDefaultResponse(200, 'Usuário verificado com sucesso!');
  } catch (error) {
    console.log('Error on confirm user: ', error);
    return formatDefaultResponse(
      500,
      'Erro ao confirmar usuário! Tente novamente ou contacte o administrador do sistema.'
    );
  }
};
