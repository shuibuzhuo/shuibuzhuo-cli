'use strict';
import createCommitCommand from '@shuibuzhuo/commit'
import createCLI from './createCLI.js'

export default function () {
  console.log('cli running');
  const program = createCLI()
  // 注册提交命令
  createCommitCommand(program)
  program.parse(process.argv)
}

