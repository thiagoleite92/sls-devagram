import { FileData } from 'aws-multipart-parser/dist/models';
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
import { parse } from 'aws-multipart-parser';
import { imageAllowedExtensions } from '../constants/Regexes';

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

export const update: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
  try {
    const { USER_TABLE, AVATAR_BUCKET } = process.env
    
if (!USER_TABLE || !AVATAR_BUCKET) {
  return formatDefaultResponse(500, 'ENVs para serviço não encontradas.')
} 

const userId = getUserIdFromEvent(event);

  if (!userId) {
    return formatDefaultResponse(400, 'Usuário não encontrado.')
  }

  if (!event.body) {
    return formatDefaultResponse(400, 'Parâmetros de entrada invaĺidos.')
  }
  
  const user = await UserModel.get({'cognitoId': userId})

  const formData = parse(event, true);

  const file = formData.file as FileData;
  const name = formData.name as string;

  if (name && name.trim().length < 2) {
    return formatDefaultResponse(400, 'Nome inválido.');
  } else if (name) {
    user.name = name;
  }



  if (file && !imageAllowedExtensions.exec(file.filename)) {
    return formatDefaultResponse(
      400,
      'Extensão informada do arquivo não é válida'
    );
  } else if (file) {
    const newKey = await new S3Service().saveImage(AVATAR_BUCKET, 'avatar', file)

    user.avatar = newKey
  }

  await UserModel.update(user)  ;

  return formatDefaultResponse(200, 'Usuário alterado com sucesso!')

  } catch (error) {
      console.log('Error on update user data: ', error)
      return formatDefaultResponse(500, 'Erro ao atualizar dados do usuário. Tente novamente ou contacte o administrador do sistema.')
  }
}
