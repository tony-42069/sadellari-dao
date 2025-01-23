import { EmailTemplate } from '../service/email-service';

export const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
  dailyReport: {
    id: 'daily-report',
    subject: 'DAO Daily Report - {{date}}',
    content: `
      # Daily DAO Activity Report
      
      ## Governance
      {{governance_summary}}
      
      ## Treasury
      {{treasury_summary}}
      
      ## Active Proposals
      {{active_proposals}}
      
      ## Agent Activity
      {{agent_activity}}
    `,
    variables: ['date', 'governance_summary', 'treasury_summary', 'active_proposals', 'agent_activity']
  },
  
  proposalNotification: {
    id: 'proposal-notification',
    subject: 'New DAO Proposal: {{proposal_title}}',
    content: `
      A new proposal has been submitted to the DAO.
      
      Title: {{proposal_title}}
      Proposer: {{proposer}}
      Description: {{description}}
      
      View and vote on this proposal at: {{proposal_url}}
      
      Voting Period: {{voting_period}}
    `,
    variables: ['proposal_title', 'proposer', 'description', 'proposal_url', 'voting_period']
  },
  
  criticalAlert: {
    id: 'critical-alert',
    subject: '🚨 DAO Critical Alert: {{alert_title}}',
    content: `
      ⚠️ CRITICAL ALERT
      
      Type: {{alert_type}}
      Time: {{timestamp}}
      
      Details:
      {{alert_details}}
      
      Required Actions:
      {{required_actions}}
      
      Contact {{contact_person}} immediately if you have questions.
    `,
    variables: ['alert_title', 'alert_type', 'timestamp', 'alert_details', 'required_actions', 'contact_person']
  }
};
