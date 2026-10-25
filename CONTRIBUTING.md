# Contributing to X3D

Bug reports, accessibility improvements, documentation, anatomy improvements, and pull requests are welcome.

## Start developing

Use Node.js 22.12 or later and npm on Windows, macOS, or Linux.

```sh
git clone https://github.com/SuperPanda7852/x3d.git
cd x3d
npm ci
npm run dev
```

No account, API key, model download, or backend service is needed to run the app.

## Check a change

```sh
npm run build
npx playwright install chromium
npm test
```

On Linux, `npx playwright install --with-deps chromium` also installs the browser's system dependencies. `npm test` starts and stops its own local server. Set `X3D_BASE_URL` to test an already running server instead. Set `X3D_BROWSER_PATH` to use a particular Chromium executable. Test artifacts are written to the ignored `test-results/` directory.

The GitHub Actions workflow builds on Windows, macOS, and Linux and runs Chromium browser checks on Linux.

## Submit a change

1. Fork the repository and create a branch for your change.
2. Keep the change focused. Describe the problem and the resulting behavior.
3. Include relevant verification and screenshots for visual changes.
4. Open a pull request against `main`.

Use generated or properly licensed test images. Do not submit patient images, identifying information, tokens, or credentials. Describe any anatomy assumptions and model provenance. Reports and UI must continue to distinguish synthetic examples, user-authored notes, and any future validated analysis output.

## Reporting issues

Use [GitHub Issues](https://github.com/SuperPanda7852/x3d/issues). Include your browser and operating system, steps to reproduce the problem, expected behavior, and what happened. Synthetic examples are enough for most bug reports.

## License

Contributions are provided under the project's [MIT license](LICENSE). Third-party dependencies retain their own licenses and notices.
