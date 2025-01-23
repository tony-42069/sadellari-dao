import { EmailMessage } from '@sadellari-dao/sdk/types/communication';
import { TemplateEngine } from './template-engine';

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
    if (message.metadata.templateId) {
      const template = this.templates.get(message.metadata.templateId);
      if (!template) {
        throw new Error(`Template ${message.metadata.templateId} not found`);
      }

      // Validate template data
      if (!message.metadata.templateData) {
        throw new Error('Template data is required when using a template');
      }

      TemplateEngine.validateData(template.variables, message.metadata.templateData);

      // Render template
      const renderedSubject = TemplateEngine.render(template.subject, message.metadata.templateData);
      const renderedContent = TemplateEngine.render(template.content, message.metadata.templateData);

      // Update message with rendered content
      message.metadata.subject = renderedSubject;
      message.content = renderedContent;
    }

    // Send using configured provider
    if (this.config.provider === 'sendgrid') {
      await this.sendWithSendGrid(message);
    } else {
      await this.sendWithSES(message);
    }
  }

  private async sendWithSendGrid(message: EmailMessage): Promise<void> {
    // SendGrid implementation
    throw new Error('SendGrid implementation pending');
  }

  private async sendWithSES(message: EmailMessage): Promise<void> {
    // AWS SES implementation
    throw new Error('SES implementation pending');
  }
}
