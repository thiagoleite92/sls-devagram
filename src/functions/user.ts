import { UserModel } from './../models/UserModel';
import { APIGatewayEvent, Handler } from 'aws-lambda';
import { CognitoServices } from '../services/CognitoServices';
import { LoginRequest } from '../types/login/LoginRequest';
import { getUserIdFromEvent } from '../utils/authenticationHandlerUtils';
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from '../utils/formatResponseUtil';
import { S3Service } from '../services/S3Services';

export const me: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const {USER_TABLE, AVATAR_BUCKET } = process.env

    if (!USER_TABLE || !AVATAR_BUCKET) {
      return formatDefaultResponse(500, 'ENVs para serviço não encontradas.')
    }

    const userId = getUserIdFromEvent(event)

    if (!userId) {
      return formatDefaultResponse(400, 'Usuário não encontrado.')
    }

    const user = await UserModel.get({'cognitoId': userId})

    if (user && user.avatar) {
      const url = await new S3Service().getImageUrl(AVATAR_BUCKET, user.avatar);

      user.avatar = url
    }

    return formatDefaultResponse(200, undefined, user);
  } catch (error) {
    console.log('Error on request forgot password: ', error);
    return formatDefaultResponse(
      500,
      'Erro realizar autenticacão de usuário! Tente novamente ou contacte o administrador do sistema.'
    );
  }
};
