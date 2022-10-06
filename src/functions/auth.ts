import { UserModel } from './../models/UserModel';
import { User } from './../types/models/User';
import { CognitoServices } from './../services/CognitoServices';
import { UserRegisterRequest } from './../types/auth/UserRegisterRequest';
import type { Handler, APIGatewayEvent } from 'aws-lambda';
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from '../utils/formatResponseUtil';
import {
  emailRegex,
  imageAllowedExtensions,
  passwordRegex,
} from '../constants/Regexes';
import { ConfirEmailRequest } from '../types/auth/ConfirmEmailRequest';
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';
import { S3Service } from '../services/S3Services';
import { ChangePasswordRequest } from '../types/auth/ChangePasswordRequest';

export const register: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID, USER_TABLE, AVATAR_BUCKET } =
      process.env;

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

    if (!AVATAR_BUCKET) {
      return formatDefaultResponse(
        500,
        'ENVs do bucket não encontrada! Por favor, avise ao administrador do sistema.'
      );
    }

    if (!event.body) {
      return formatDefaultResponse(400, 'Parametros de entrada inválidos.');
    }

    const formData = parse(event, true);

    console.log('formData', formData);

    const file = formData.file as FileData;
    const name = formData.name as string;
    const email = formData.email as string;
    const password = formData.password as string;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, 'Email inválido.');
    }

    if (!password || !password.match(passwordRegex)) {
      return formatDefaultResponse(400, 'Senha inválido.');
    }

    if (!name || name.trim().length < 2) {
      return formatDefaultResponse(400, 'Nome inválido.');
    }

    if (file && !imageAllowedExtensions.exec(file.filename)) {
      return formatDefaultResponse(
        400,
        'Extensão informada do arquivo não é válida'
      );
    }

    const cognitoUser = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID
    ).signUp(email, password);

    let key = undefined;

    if (file) {
      key = await new S3Service().saveImage(AVATAR_BUCKET, 'avatar', file);
    }

    const user = {
      name,
      email,
      cognitoId: cognitoUser.userSub,
      avatar: key,
    } as User;

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

export const forgotPassword: Handler = async (
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

    const { email } = request;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, 'Email inválido.');
    }

    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).forgotPassword(
      email
    );

    return formatDefaultResponse(
      200,
      'Solicitação de troca de senha realizada com sucesso!'
    );
  } catch (error) {
    console.log('Error on request forgot password: ', error);
    return formatDefaultResponse(
      500,
      'Erro ao soliticar troca de senha de usuário! Tente novamente ou contacte o administrador do sistema.'
    );
  }
};

export const changePassword: Handler = async (
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

    const { email, verificationCode, password } =
      request as ChangePasswordRequest;

    if (!email || !email.match(emailRegex)) {
      return formatDefaultResponse(400, 'Email inválido.');
    }

    if (!password || !password.match(passwordRegex)) {
      return formatDefaultResponse(400, 'Senha inválido.');
    }

    if (!verificationCode || verificationCode.length !== 6) {
      return formatDefaultResponse(400, 'Código inválido');
    }

    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).changePassword(
      email,
      password,
      verificationCode
    );

    return formatDefaultResponse(200, 'Troca de senha realizada com sucesso!');
  } catch (error) {
    console.log('Error on request forgot password: ', error);
    return formatDefaultResponse(
      500,
      'Erro ao soliticar troca de senha de usuário! Tente novamente ou contacte o administrador do sistema.'
    );
  }
};
