import core, { API, ASTPath, Collection, FileInfo, FunctionExpression } from 'jscodeshift';

// DOC: to check AST node types use https://astexplorer.net/
// then:
// 1. set the transformer to "recast"
// 2. in "settings", set "typescript" as the parser

export type AsyncItTransformerOptions = {
  describeFuncName: string;
  itFuncName: string;
  doneFuncName: string;
  rmDoneFunc: boolean;
  rmDoneFuncMode: 'rm' | 'throw';
}

function isOnlyStatementInBody(path: ASTPath<any>) {
  const parentBody = path.parent?.node?.body;
  return parentBody && (!Array.isArray(parentBody) || parentBody.length === 1);
}

function rmFuncCalls(j: core.JSCodeshift, statements: Collection<any>, name: string, options: AsyncItTransformerOptions) {

  const relevantFuncCalls = statements
    .find(j.CallExpression, {
      callee: {
        type: 'Identifier',
        name: name
      },
    });

  if (options.rmDoneFuncMode === 'throw') {
    // replace the relevant func calls we've found with throws
    // this is probably affected by a double-semicolon bug:
    // https://github.com/facebook/jscodeshift/issues/492
    relevantFuncCalls
      .forEach(call => {
        const throwStatement = j.throwStatement(
          j.newExpression(
            j.identifier('Error'), [j.stringLiteral('Please migrate this callback')]
          )
        );

        if (isOnlyStatementInBody(call))
          j(call.parent).find(j.CallExpression).replaceWith(j.blockStatement([throwStatement]));
        else
          call.replace(throwStatement);
      })
  } else if (options.rmDoneFuncMode === 'rm') {
    // remove the relevant func calls we've found
    relevantFuncCalls.forEach(call => {
      if (isOnlyStatementInBody(call))
        j(call.parent).find(j.CallExpression).replaceWith(j.blockStatement([]));
      else
        j(call).remove();
    });
  }

  // keep searching in nested callbacks
  statements
    // find func calls with arguments
    .find(j.CallExpression)
    .filter((path, i, paths) => path.node.arguments.length > 0)
    // find func arguments in those func calls
    .find(j.FunctionExpression)
    .find(j.BlockStatement)
    .forEach(block => {
      rmFuncCalls(j, j(block.node.body), name, options);
    });
}

export function asyncItAstTransformer(j: core.JSCodeshift, root: Collection<any>, options: AsyncItTransformerOptions) {
  const itFuncCalls = root
    // find all describe calls
    .find(j.CallExpression, {
      callee: {
        type: 'Identifier',
        name: options.describeFuncName
      },
    })
    .filter((path, i, paths) => path.node.arguments.length === 2 &&
      path.node.arguments[0].type !== 'FunctionExpression' &&
      path.node.arguments[1].type === 'FunctionExpression'
    )
    // find the 2nd argument of describe
    .find(j.FunctionExpression)
    // find all 'it' func calls with 2 params
    // and the 2nd param must be a function expr
    .find(j.CallExpression, {
      callee: {
        type: 'Identifier',
        name: options.itFuncName
      },
    })
    .filter((path, i, paths) => path.node.arguments.length === 2 &&
      path.node.arguments[0].type !== 'FunctionExpression' &&
      path.node.arguments[1].type === 'FunctionExpression'
    )
    // replace 'it' func arg with an async parameterless func
    .forEach(call => {
      const funcArg = (call.node.arguments[1] as FunctionExpression);
      const asyncFuncArg = j.functionExpression.from({
        async: true,
        body: funcArg.body,
        params: []
      });
      const newCallArgs = [call.node.arguments[0], asyncFuncArg];
      call.replace(j.callExpression(call.node.callee, newCallArgs))
    });

  if (options.rmDoneFunc) {
    itFuncCalls
      .forEach(call => {
        // find body of 'it' callback arg
        const funcArg = (call.node.arguments[1] as FunctionExpression);
        const body = funcArg.body.body;
        // remove every call to the 'done' func in the body
        // we're looking for callbacks parameters that call the 'done' func
        // we run a recursive search because those are usually nested
        rmFuncCalls(j, j(body), options.doneFuncName, options);
      })
  }

  return itFuncCalls;
}

export default function asyncItTransformer(file: FileInfo, api: API, userOptions: Record<string, any>) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const defaultOptions: AsyncItTransformerOptions = {
    describeFuncName: 'describe',
    itFuncName: 'it',
    doneFuncName: 'done',
    rmDoneFunc: false,
    rmDoneFuncMode: 'rm'
  };
  const options: AsyncItTransformerOptions = Object.assign({ ...defaultOptions }, userOptions);

  asyncItAstTransformer(j, root, options);

  return root.toSource({ lineTerminator: '\n', quote: 'single' });
}
