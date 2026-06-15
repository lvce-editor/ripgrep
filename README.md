# ripgrep

A module for using [ripgrep](https://github.com/BurntSushi/ripgrep/) in a Node project.

This package re-exports `rgPath` from [vscode-ripgrep](https://github.com/microsoft/vscode-ripgrep).

## Install

```sh
$ npm install @lvce-editor/ripgrep
```

## Usage

```js
import { rgPath } from '@lvce-editor/ripgrep'
import { spawn } from 'node:child_process'

const childProcess = spawn(rgPath, ['abc', '.'], {
  stdio: 'inherit',
})
```

## Credits

This project is very much based on https://github.com/microsoft/vscode-ripgrep by Microsoft.
