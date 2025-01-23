/**
 * Simple template engine for replacing variables in email templates
 */
export class TemplateEngine {
  /**
   * Replace template variables with actual values
   * @param template The template string with {{variable}} placeholders
   * @param data Object containing variable values
   */
  static render(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (data.hasOwnProperty(key)) {
        return data[key];
      }
      throw new Error(`Template variable "${key}" not provided`);
    });
  }

  /**
   * Validate that all required variables are present in the data
   * @param variables Array of required variable names
   * @param data Object containing variable values
   */
  static validateData(variables: string[], data: Record<string, string>): void {
    const missing = variables.filter(v => !data.hasOwnProperty(v));
    if (missing.length > 0) {
      throw new Error(`Missing required template variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Extract all variable names from a template string
   * @param template The template string
   */
  static extractVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map(match => match.slice(2, -2));
  }
}
