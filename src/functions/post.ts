import { FileData } from 'aws-multipart-parser/dist/models';
import { UserModel } from '../models/UserModel';
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
import { validateEnvs } from '../utils/environmentsUtils';
import * as Uuid from 'uuid';
import * as moment from 'moment';
import { PostModel } from '../models/PostModel';

export const create: Handler = async (
  event: APIGatewayEvent
): Promise<DefaultJsonResponse> => {
  try {
    const { POST_BUCKET, error } = validateEnvs(['POST_BUCKET', 'POST_TABLE']);

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

    if (!user) {
      return formatDefaultResponse(400, 'Usuário não encontrado.');
    }

    const formData = parse(event, true);

    const file = formData.file as FileData;
    const description = formData.description as string;

    if (!description || description.trim().length < 5) {
      return formatDefaultResponse(400, 'Descrição inválida.');
    }

    if (!file || !imageAllowedExtensions.exec(file.filename)) {
      return formatDefaultResponse(
        400,
        'Extensão informada do arquivo não é válida'
      );
    }

    const imageKey = await new S3Service().saveImage(POST_BUCKET, 'post', file);

    const post = {
      id: Uuid.v4(),
      userId,
      description,
      date: moment().format(),
      image: imageKey,
    };

    await PostModel.create(post);

    user.posts = user.posts + 1;

    await UserModel.update(user);

    return formatDefaultResponse(200, 'Publicação criada com sucesso!');
  } catch (error) {
    console.log('Error on create post: ', error);
    return formatDefaultResponse(
      500,
      'Erro ao criar publicação. Tente novamente ou contacte o administrador do sistema.'
    );
  }
};
