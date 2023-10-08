import core, { API, ASTPath, Collection, FileInfo } from 'jscodeshift';

// DOC: to check AST node types use https://astexplorer.net/
// then:
// 1. set the transformer to "recast"
// 2. in "settings", set "typescript" as the parser

type AsyncItTransformerOptions = {
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

export default function asyncItTransformer(file: FileInfo, api: API, userOptions: Record<string, any>) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const describeFuncName = 'describe';
  const itFuncName = 'it';
  const doneFuncName = 'done';

  const defaultOptions: AsyncItTransformerOptions = {
    rmDoneFunc: false,
    rmDoneFuncMode: 'rm'
  };
  const options: AsyncItTransformerOptions = Object.assign({ ...defaultOptions }, userOptions);

  const itFuncCallbackArgs = root
    // find all describe calls
    .find(j.CallExpression, {
      callee: {
        type: 'Identifier',
        name: describeFuncName
      },
    })
    .filter((path, i, paths) => path.node.arguments.length === 2 &&
      path.node.arguments[0].type !== 'FunctionExpression' &&
      path.node.arguments[1].type === 'FunctionExpression'
    )
    // find the 2nd argument of describe
    .find(j.FunctionExpression)
    // find all it calls
    .find(j.CallExpression, {
      callee: {
        type: 'Identifier',
        name: itFuncName
      },
    })
    .filter((path, i, paths) => path.node.arguments.length === 2 &&
      path.node.arguments[0].type !== 'FunctionExpression' &&
      path.node.arguments[1].type === 'FunctionExpression'
    )
    // find the 2nd argument of 'it'
    .find(j.FunctionExpression)
    // replace 'it' with an async parameterless func
    .forEach(func => {
      func.replace(
        j.functionExpression.from({
          async: true,
          body: func.node.body,
          params: []
        })
      );
    });

  if (options.rmDoneFunc) {
    itFuncCallbackArgs
      // find body of 'it' callback arg
      .find(j.BlockStatement)
      // remove every call to the 'done' func in the body
      // we're looking for callbacks parameters that call the 'done' func
      // we do a recursive search because those are usually nested
      .forEach(block => {
        rmFuncCalls(j, j(block.node.body), doneFuncName, options);
      })
      ;
  }


  return root.toSource({ lineTerminator: '\n', quote: 'single' });
}
