# Windows-ზე დაყენება (Setup for Windows)

## Git Hooks-ის კონფიგურაცია

თქვენ Windows-ზე მუშაობთ და Git hooks-ის გასააქტიურებლად ერთხელ უნდა გაუშვათ ეს ბრძანება:

### ვარიანტი 1: PowerShell ან CMD-ში
```bash
git config core.hooksPath .githooks
```

### ვარიანტი 2: npm script-ის გამოყენება
```bash
npm run setup-hooks
```

### ვარიანტი 3: Windows batch file-ის გამოყენება
```bash
setup-git-hooks.bat
```

## რას აკეთებს ეს?

ეს ბრძანება Git-ს უთხრა, რომ გამოიყენოს `.githooks` საქაღალდე pre-commit hook-ებისთვის.
ეს hook ავტომატურად გაუშვებს lint-staged-ს თქვენი კოდის შესამოწმებლად ყოველი commit-ის წინ.

## შემოწმება

დარწმუნდით, რომ კონფიგურაცია მუშაობს:

```bash
git config --get core.hooksPath
```

უნდა დაბეჭდოს: `.githooks`

## თუ არ გინდათ pre-commit hook-ები

თუ არ გინდათ ავტომატური შემოწმებები commit-ის წინ, შეგიძლიათ გამორთოთ:

```bash
git config --unset core.hooksPath
```

ან commit-ისას გამოიყენოთ `--no-verify` flag:

```bash
git commit --no-verify -m "your message"
```

## პრობლემის მოგვარება

თუ კვლავ ხედავთ შეცდომას "cannot spawn .githooks/pre-commit", შეამოწმეთ:

1. ✅ Git-ის კონფიგურაცია სწორია: `git config --get core.hooksPath`
2. ✅ Node.js დაყენებულია და მუშაობს: `node --version`
3. ✅ ფაილი `.githooks/pre-commit` არსებობს პროექტში

თუ GitHub Desktop-ში ყოფნისას პრობლემა გრძელდება:
- დახურეთ და ხელახლა გახსენით GitHub Desktop
- ან გამოიყენეთ VS Code-ის integrated terminal git ბრძანებებისთვის
