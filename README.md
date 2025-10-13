# ripgrep

A module for using [ripgrep](https://github.com/BurntSushi/ripgrep/) in a Node project.

Same as [vscode-ripgrep](https://github.com/microsoft/vscode-ripgrep), but fixes the github rate limiting error `Downloading ripgrep failed: Error: Request failed: 403` by downloading the files directly instead of also using the github rest api.

## Install

```
$ npm install @lvce-editor/ripgrep
```

## Usage

```js
import { rgPath } from "@lvce-editor/ripgrep"
import { spawn } from 'node:child_process'

const childProcess = spawn(rgPath, ["abc", "."], {
  stdio: "inherit",
});
```

## Environment Variables

- `RIPGREP_PREBUILT_BINARIES_MIRROR`: Specify a custom mirror URL for downloading ripgrep prebuilt binaries. This is useful for users in regions where GitHub releases are slow or inaccessible, or for organizations using internal mirrors.
  - **Default**: `https://github.com/microsoft/ripgrep-prebuilt/releases/download`
  - **Example**: `export RIPGREP_PREBUILT_BINARIES_MIRROR=https://your-mirror.com/ripgrep-prebuilt/releases/download`
  - **Note**: The mirror URL should follow the same path structure as the official repository, with binaries available at `{mirror-url}/{version}/ripgrep-{version}-{target}`

## Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io#https://github.com/lvce-editor/ripgrep)

## Credits

This project is very much based on https://github.com/microsoft/vscode-ripgrep by Microsoft.
