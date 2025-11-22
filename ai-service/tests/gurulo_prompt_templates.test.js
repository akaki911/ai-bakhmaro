const guruloCore = require('../shared/gurulo-core');

const {
  SYSTEM_PROMPT_GURULO,
  DEVELOPER_PROMPT,
  getPromptTemplate,
} = guruloCore.prompts;
const { SYSTEM_PROMPTS, composeBasePrompt, appendCreatorContext } = require('../context/system_prompts');

describe('Gurulo prompt templates', () => {
  test('system prompt enforces brand, language, and structure', () => {
    expect(SYSTEM_PROMPT_GURULO).toContain('Gurulo');
    expect(SYSTEM_PROMPT_GURULO).toContain('ka-GE');
    expect(SYSTEM_PROMPT_GURULO).toContain('Task, Plan/Explanation, Final, Verification, Warnings');
  });

  test('developer prompt references AGENTS.md guardrails', () => {
    expect(DEVELOPER_PROMPT).toContain('AGENTS.md');
    expect(DEVELOPER_PROMPT).toContain('System/Developer/User prompts');
    expect(DEVELOPER_PROMPT).toContain('npm run lint --if-present');
  });

  test('template lookup resolves aliases', () => {
    expect(getPromptTemplate('system_prompt.gurulo')).toBe(SYSTEM_PROMPT_GURULO);
    expect(getPromptTemplate('developerPrompt')).toBe(DEVELOPER_PROMPT);
    expect(getPromptTemplate('developer.prompt')).toBe(DEVELOPER_PROMPT);
  });

  test('system prompt builders ამკაცრებს ინფორმაციის დეფიციტისა და ციტირების წესებს', () => {
    expect(SYSTEM_PROMPTS.base).toContain('თუ საკმარისი ინფორმაცია არ გაქვს');
    expect(SYSTEM_PROMPTS.base).toContain('სნიპეტები/ცოდნა ყოველთვის ციტირებით');
    expect(SYSTEM_PROMPTS.memoryAware).toContain('მიღებული სნიპეტები ან კონტექსტი აუცილებლად მოყოლდეს ციტირებით');
    expect(SYSTEM_PROMPTS.codeAssistant).toContain('ყველა მიღებულ კოდის ფრაგმენტს ან ცოდნას თან ახლდეს ციტირება/წყაროს');
  });

  test('creator context is appended only for super admin users', () => {
    const ownerContext = { user: { personalId: '01019062020', name: 'აკაკი ცინცაძე' } };
    const promptWithCreator = composeBasePrompt(ownerContext);
    expect(promptWithCreator).toContain('Creator Context');
    expect(promptWithCreator).toContain('აკაკი ცინცაძე');

    const promptWithoutCreator = composeBasePrompt({ user: { personalId: '99999999999', name: 'გიორგი' } });
    expect(promptWithoutCreator).not.toContain('Creator Context');

    const appended = appendCreatorContext('base prompt', ownerContext);
    expect(appended).toContain('base prompt');
    expect(appended).toContain('Creator Context');
  });
});
