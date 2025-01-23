import { EmailMessage } from '@sadellari-dao/sdk/types/communication';

export interface EmailConfig {
  provider: 'sendgrid' | 'ses';
  apiKey: string;
  defaultFrom: string;
  templates: {
    [key: string]: {
      id: string;
      subject: string;
    };
  };
}

export interface EmailTemplate {
  id: string;
  subject: string;
  content: string;
  variables: string[];
}

export class EmailService {
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async registerTemplate(name: string, template: EmailTemplate): Promise<void> {
    this.templates.set(name, template);
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const template = this.templates.get(message.metadata.templateId);
    if (!template) {
      throw new Error(`Template ${message.metadata.templateId} not found`);
    }

    if (this.config.provider === 'sendgrid') {
      await this.sendWithSendGrid(message, template);
    } else {
      await this.sendWithSES(message, template);
    }
  }

  private async sendWithSendGrid(message: EmailMessage, template: EmailTemplate): Promise<void> {
    // SendGrid implementation
    throw new Error('SendGrid implementation pending');
  }

  private async sendWithSES(message: EmailMessage, template: EmailTemplate): Promise<void> {
    // AWS SES implementation
    throw new Error('SES implementation pending');
  }
}
