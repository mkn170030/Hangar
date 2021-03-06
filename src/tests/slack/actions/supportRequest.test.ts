/* eslint-disable @typescript-eslint/camelcase, @typescript-eslint/no-explicit-any */
import 'jest';
import { WebClient } from '@slack/web-api';
import { supportRequest } from '../../../slack/actions/supportRequest';
import { actionIds } from '../../../slack/constants';
import { Config } from '../../../entities/config';
import { SupportRequest } from '../../../entities/supportRequest';
import logger from '../../../logger';
import * as openAlertModal from '../../../slack/utilities/openAlertModal';

jest.mock('../../../slack/utilities/postAdminNotification');

const openAlertModalSpy = jest.spyOn(openAlertModal, 'openAlertModal').mockImplementation();

const configFindToggleForKeySpy = jest.spyOn(Config, 'findToggleForKey');
let supportRequestQueueActive = false;

const mockClient = new WebClient();

const usersInfoSpy = jest.spyOn(mockClient.users, 'info').mockImplementation();

const saveSupportRequest = jest.fn();
const countSupportRequest = jest.fn();
jest.mock('../../../entities/supportRequest', () => {
  function MockSupportRequest(): object {
    return {
      save: saveSupportRequest,
    };
  }
  const { SupportRequestStatus, SupportRequestType } = jest.requireActual('../../../entities/supportRequest');
  return { SupportRequest: MockSupportRequest, SupportRequestType, SupportRequestStatus };
});
SupportRequest.count = countSupportRequest;

jest.spyOn(logger, 'error').mockImplementation();

const jobChatArgs: any = {
  ack: jest.fn(),
  body: {
    user: {
      id: 'XXX',
    },
    trigger_id: 'XXX',
  },
  client: mockClient,
  action: {
    action_id: actionIds.joinJobChatQueue,
  },
};

describe('supportRequest Handler', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    configFindToggleForKeySpy.mockImplementation(async (key: string) => {
      switch (key) {
        case 'supportRequestQueueActive':
          return supportRequestQueueActive;

        default:
          return false;
      }
    });
    countSupportRequest.mockResolvedValue(0);
    supportRequestQueueActive = false;
  });

  it('will let the user know the job chat queue is not active', async () => {
    supportRequestQueueActive = false;
    await supportRequest(jobChatArgs);
    expect(openAlertModalSpy).toBeCalled();
  });

  it('will add the user to the db for job chat command', async () => {
    supportRequestQueueActive = true;
    await supportRequest(jobChatArgs);
    expect(usersInfoSpy).toBeCalled();
  });
});
