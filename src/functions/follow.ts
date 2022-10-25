import { UserModel } from './../models/UserModel';
import { getUserIdFromEvent } from './../utils/authenticationHandlerUtils';
import { validateEnvs } from './../utils/environmentsUtils';
import { Handler } from 'aws-lambda';
import {
  DefaultJsonResponse,
  formatDefaultResponse,
} from '../utils/formatResponseUtil';

export const toggle: Handler = async (
  event: any
): Promise<DefaultJsonResponse> => {
  try {
    const { error } = validateEnvs(['USER_TABLE']);

    if (error) {
      return formatDefaultResponse(500, error);
    }

    const userId = getUserIdFromEvent(event);

    if (!userId) {
      return formatDefaultResponse(400, 'Usuário não encontrado.');
    }

    const { followId } = event.pathParameters;

    if (userId === followId) {
      return formatDefaultResponse(
        400,
        'O usuário não pode seguir a si próprio.'
      );
    }

    const loggedUser = await UserModel.get({ cognitoId: userId });

    if (!loggedUser) {
      return formatDefaultResponse(400, 'Usuário não encontrado.');
    }

    const followUser = await UserModel.get({ cognitoId: followId });

    if (!followUser) {
      return formatDefaultResponse(400, 'Usuário visitado não encontrado.');
    }

    const hasFollow = loggedUser.following.findIndex((obj: any) => {
      return obj.toString() === followId;
    });

    if (hasFollow != -1) {
      loggedUser.following.splice(hasFollow, 1);
      followUser.followers = followUser.followers - 1;
      await UserModel.update(loggedUser);
      await UserModel.update(followUser);

      return formatDefaultResponse(200, 'Usuário deseguido com sucoesso.');
    } else {
      loggedUser.following.push(followId);
      followUser.followers = followUser.followers + 1;
      await UserModel.update(loggedUser);
      await UserModel.update(followUser);

      return formatDefaultResponse(200, 'Usuário seguido com sucoesso.');
    }
  } catch (error) {
    console.log('Error on follow/unfollow user.', error);
    return formatDefaultResponse(500, 'Error ao seguir/deseguir usuário');
  }
};
