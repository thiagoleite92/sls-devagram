import { FileData } from 'aws-multipart-parser/dist/models';
import { UserModel } from './../models/UserModel';
import { APIGatewayEvent, Handler } from 'aws-lambda';
import { getUserIdFromEvent } from '../utils/authenticationHandlerUtils';
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from '../utils/formatResponseUtil';
import { S3Service } from '../services/S3Services';
import { parse } from 'aws-multipart-parser';
import { imageAllowedExtensions } from '../constants/Regexes';
import { validateEnvs } from '../utils/environmentsUtils';
import { DefaultListPaginatedResponse } from '../types/DefaultListPaginatedResponse';

export const me: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { AVATAR_BUCKET, error } = validateEnvs([
      'AVATAR_BUCKET',
      'USER_TABLE',
    ]);

    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);

    if (!userId) {
      return formatDefaultResponse(400, 'Usuário não encontrado.');
    }

    const user = await UserModel.get({ cognitoId: userId });

    if (user && user.avatar) {
      const url = await new S3Service().getImageUrl(AVATAR_BUCKET, user.avatar);

      user.avatar = url;
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

export const update: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { AVATAR_BUCKET, error } = validateEnvs([
      'AVATAR_BUCKET',
      'USER_TABLE',
    ]);

    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);

    if (!userId) {
      return formatDefaultResponse(400, 'Usuário não encontrado.');
    }

    if (!event.body) {
      return formatDefaultResponse(400, 'Parâmetros de entrada invaĺidos.');
    }

    const user = await UserModel.get({ cognitoId: userId });

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
      const newKey = await new S3Service().saveImage(
        AVATAR_BUCKET,
        'avatar',
        file
      );

      user.avatar = newKey;
    }

    await UserModel.update(user);

    return formatDefaultResponse(200, 'Usuário alterado com sucesso!');
  } catch (error) {
    console.log('Error on update user data: ', error);
    return formatDefaultResponse(
      500,
      'Erro ao atualizar dados do usuário. Tente novamente ou contacte o administrador do sistema.'
    );
  }
};

export const getUserById: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { error, AVATAR_BUCKET } = validateEnvs([
      'AVATAR_BUCKET',
      'USER_TABLE',
    ]);

    if (error) {
      return formatDefaultResponse(500, error);
    }

    const { userId } = event.pathParameters;

    if (!userId) {
      return formatDefaultResponse(400, 'Usuário não encontrado.');
    }

    const user = await UserModel.get({ cognitoId: userId });

    if (!user) {
      return formatDefaultResponse(400, 'Usuário não encontrado.');
    }

    if (user.avatar) {
      user.avatar = await new S3Service().getImageUrl(
        AVATAR_BUCKET,
        user.avatar
      );
    }

    return formatDefaultResponse(200, undefined, user);
  } catch (error) {
    console.log('Error on get user by id: ', error);
    return formatDefaultResponse(
      500,
      'Erro ao obter dados do usuário. Tente novamente ou contacte o administrador do sistema.'
    );
  }
};

export const searchUser: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { error, AVATAR_BUCKET } = validateEnvs([
      'AVATAR_BUCKET',
      'USER_TABLE',
    ]);

    if (error) {
      return formatDefaultResponse(500, error);
    }

    const { filter } = event.pathParameters;

    if (!filter || filter.length < 3) {
      return formatDefaultResponse(400, 'Filtro não informado.');
    }

    const { lastKey } = event.queryStringParameters || '';

    const query = UserModel.scan()
      .where('name')
      .contains(filter)
      .or()
      .where('email')
      .contains(filter);

    if (lastKey) {
      query.startAt({ cognitoId: lastKey });
    }

    const result = await query.limit(1).exec();

    const response = {} as DefaultListPaginatedResponse;

    if (result) {
      response.count = result.count;
      response.lastKey = response.lastKey;

      for (const document of result) {
        if (document && document.avatar) {
          document.avatar = await new S3Service().getImageUrl(
            AVATAR_BUCKET,
            document.avatar
          );
        }
      }

      response.data = result;
    }

    return formatDefaultResponse(200, undefined, response);
  } catch (error) {
    console.log('Error on search user by filter', error);
    return formatDefaultResponse(
      500,
      'Erro ao obter dados de usuário por nome ou email. Tente novamente ou contacte o administrador do sistema.'
    );
  }
};
