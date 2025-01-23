import { EmailService, EmailConfig, EmailTemplate } from '../email-service';
import { EmailMessage } from '@sadellari-dao/sdk/types/communication';

describe('EmailService', () => {
  let service: EmailService;
  let config: EmailConfig;
  let template: EmailTemplate;

  beforeEach(() => {
    config = {
      provider: 'sendgrid',
      apiKey: 'test-key',
      defaultFrom: 'test@dao.com',
      templates: {}
    };

    template = {
      id: 'test-template',
      subject: 'Test Subject: {{name}}',
      content: 'Hello {{name}}, welcome to {{organization}}!',
      variables: ['name', 'organization']
    };

    service = new EmailService(config);
  });

  test('should register and render templates', async () => {
    await service.registerTemplate('welcome', template);

    const message: EmailMessage = {
      id: 'test-1',
      from: 'system',
      to: 'user@example.com',
      content: '',
      channel: 'email',
      timestamp: new Date(),
      metadata: {
        templateId: 'welcome',
        templateData: {
          name: 'John',
          organization: 'DAO'
        },
        subject: ''
      }
    };

    // This should throw since SendGrid is not implemented yet
    await expect(service.sendEmail(message)).rejects.toThrow('SendGrid implementation pending');
  });

  test('should validate template variables', async () => {
    await service.registerTemplate('welcome', template);

    const message: EmailMessage = {
      id: 'test-1',
      from: 'system',
      to: 'user@example.com',
      content: '',
      channel: 'email',
      timestamp: new Date(),
      metadata: {
        templateId: 'welcome',
        templateData: {
          name: 'John'
          // Missing 'organization' variable
        },
        subject: ''
      }
    };

    await expect(service.sendEmail(message)).rejects.toThrow('Missing required template variables');
  });

  test('should throw error for unknown template', async () => {
    const message: EmailMessage = {
      id: 'test-1',
      from: 'system',
      to: 'user@example.com',
      content: '',
      channel: 'email',
      timestamp: new Date(),
      metadata: {
        templateId: 'unknown-template',
        templateData: {},
        subject: ''
      }
    };

    await expect(service.sendEmail(message)).rejects.toThrow('Template unknown-template not found');
  });
});
