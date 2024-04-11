'use strict';
import Command from "@lv/command";
import SimpleGit from "simple-git";
import { log } from '@lv/utils'
import { ESLint } from 'eslint'
import { makeInput, makeList } from "@lv/utils/lib/inquirer.js";

const COMMIT_CHOICES = [
  { value: 'feat', name: 'feat: 新功能' },
  { value: 'fix', name: 'fix: 修复' },
  { value: 'docs', name: 'docs: 文档变更' },
  { value: 'style', name: 'style: 代码格式(不影响代码运行的变动)' },
  {
    value: 'refactor',
    name: 'refactor: 重构(既不是增加feature，也不是修复bug)'
  },
  { value: 'perf', name: 'perf: 性能优化' },
  { value: 'test', name: 'test: 增加测试' },
  { value: 'chore', name: 'chore: 构建过程或辅助工具的变动' },
  { value: 'revert', name: 'revert: 回退' },
  { value: 'build', name: 'build: 打包' }
]

class CommitCommand extends Command {
  get command() {
    return 'commit'
  }

  get description() {
    return 'Commit changes to the repository'
  }

  get options() {
    return []
  }

  async action() {
    log.verbose('执行 commit...')
    await this.initGit()
    await this.checkNotCommitted()
    await this.eslint()
  }

  // 初始化 git
  async initGit() {
    this.git = SimpleGit(process.cwd())
  }

  // 执行 git add, git commit
  async checkNotCommitted() {
    const status = await this.git.status()

    // 5 种状态
    // not_added created deleted modified renamed
    this.notAdded = status.not_added
    this.modified = status.modified
    this.created = status.created
    this.deleted = status.deleted
    this.renamed = status.renamed.map((item) => item.to)
  }

  // eslint 检查
  async eslint() {
    // 忽略检查的文件列表
    const ignoreList = ['.gitignore', '.eslintignore']
    // 1.1 执行工作，执行 eslint
    log.info("正在执行eslint检查");
    const cwd = process.cwd();
    // const eslint = new ESLint({ cwd, overrideConfig: vueConfig });
    const eslint = new ESLint({ cwd });

    // 最终需要使用 eslint 检查的文件
    let finalLintFiles = [
      ...this.notAdded, 
      ...this.modified, 
      ...this.created, 
      // ...this.deleted, // 删除的不需要用 eslint 检查
      ...this.renamed
    ]
    
    // 需要过滤掉忽略检查的文件
    finalLintFiles = finalLintFiles.filter(item => !ignoreList.includes(item))

    // 进行 eslint 检查
    const results = await eslint.lintFiles(finalLintFiles);
    // 生成格式化工具 formatter，用于格式化最终结果
    const formatter = await eslint.loadFormatter("stylish");
    // 格式化 eslint 检查结果
    const resultText = formatter.format(results);
    // 下面的 console.log 不能删，用于在终端打印出 ESLint 检查结果
    console.log(resultText);

    if (resultText.length > 0) {
      // 如果检查结果有内容，证明存在 eslint 错误
      log.error('存在 eslint 错误，请先修复')
    } else {
      // 检查结果无内容，证明不存在 eslint 错误
      log.success('eslint 检查通过！下面开始提交')
      await this.doCommit()
    }
  }

  // TODO 添加 debug 时候的日志
  async doCommit() {
    // git add
    await this.git.add(this.notAdded);
    await this.git.add(this.modified);
    await this.git.add(this.created)
    await this.git.add(this.deleted);
    // renamed [{ from: 'abc100', to: 'abc100_update' }]
    // 是对象形式，我们要转换成字符串形式
    await this.git.add(this.renamed);
    log.success('git add 成功')

    // git commit
    // 选择提交类型
    let type;
    if (!type) {
      type = await makeList({
        choices: COMMIT_CHOICES,
        message: '请选择提交类型',
        defaultValue: 'feat'
      });
    }
    // 填写提交信息
    let inputMessage
    if (!inputMessage) {
      inputMessage = await makeInput({
        message: '请填写提交信息'
      });
    }
    const commitMessage = `${type}: ${inputMessage} (by lv-commit)`;
    await this.git.commit(commitMessage);
    log.success("git commit 成功");
  }
}

function Commit(instance) {
  return new CommitCommand(instance);
}

export default Commit;
