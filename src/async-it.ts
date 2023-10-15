import core, { API, ASTPath, Collection, FileInfo, FunctionExpression } from 'jscodeshift';

// DOC: to check AST node types use https://astexplorer.net/
// then:
// 1. set the transformer to "recast"
// 2. in "settings", set "typescript" as the parser

export type AsyncItTransformerOptions = {
  describeFuncName: string;
  itFuncName: string;
  doneFuncName: string;
  skipFuncName: string;
  rmDoneFunc: boolean;
  rmDoneFuncMode: 'rm' | 'throw';
}

function isOnlyStatementInArrowFunc(path: ASTPath<any>) {
  const parentBody = path.parent?.node?.body;
  const parentType = path.parent?.node?.type;
  return parentBody
    && parentType === 'ArrowFunctionExpression'
    && (!Array.isArray(parentBody) || parentBody.length === 1);
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
    .filter(path => path.node.arguments.length === 2 &&
      path.node.arguments[0].type !== 'FunctionExpression' &&
      path.node.arguments[1].type === 'FunctionExpression'
    )
    // find all child func expression
    // it calls will always be inside the 2nd argument of describe
    .find(j.FunctionExpression)
    // find all 'it' func calls
    .find(j.CallExpression, path => {
      // allow it func calls
      const isItCall = ((path.callee.type === 'Identifier' &&
        path.callee.name === options.itFuncName) ||
        // allow it.skip calls
        (path.callee.type === 'MemberExpression' &&
          path.callee.object.type === 'Identifier' &&
          path.callee.object.name === options.itFuncName &&
          path.callee.property.type === 'Identifier' &&
          path.callee.property.name === options.skipFuncName)) &&
        // check args
        path.arguments.length === 2 &&
        path.arguments[0].type !== 'FunctionExpression' &&
        (path.arguments[1].type === 'FunctionExpression' ||
          path.arguments[1].type === 'ArrowFunctionExpression') &&
        path.arguments[1].async === false;
      return isItCall;
    });

  // replace 'it' func arg with an async parameterless func
  itFuncCalls.forEach(call => {
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
    // remove every call to the 'done' func in the body
    const doneCalls = itFuncCalls.find(j.FunctionExpression)
      .find(j.CallExpression, {
        callee: {
          type: 'Identifier',
          name: options.doneFuncName
        },
      });
    doneCalls.forEach(call => {
      // we need this type guard because in this loop we might
      // get nodes of unwanted types (have yet to understand why)
      // (could it be the replace we're doing below?)
      if (call.node.type !== 'CallExpression') return;

      if (options.rmDoneFuncMode === 'throw') {
        // replace the relevant func calls we've found with throws
        // this mode is probably affected by a double-semicolon bug:
        // https://github.com/facebook/jscodeshift/issues/492
        // but formatters will usually automatically fix this
        const throwStatement = j.throwStatement(
          j.newExpression(
            j.identifier('Error'), [j.stringLiteral('Please migrate this callback')]
          )
        );
        if (isOnlyStatementInArrowFunc(call))
          j(call).replaceWith(j.blockStatement([throwStatement]));
        else
          call.replace(throwStatement);
      } else if (options.rmDoneFuncMode === 'rm') {
        // remove the relevant func calls we've found
        if (isOnlyStatementInArrowFunc(call))
          j(call).replaceWith(j.blockStatement([]));
        else
          j(call).remove();
      }
    });
  }

  return itFuncCalls;
}

export default function asyncItTransformer(file: FileInfo, api: API, userOptions: Record<string, any>) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const defaultOptions: AsyncItTransformerOptions = {
    describeFuncName: 'describe',
    itFuncName: 'it',
    skipFuncName: 'skip',
    doneFuncName: 'done',
    rmDoneFunc: false,
    rmDoneFuncMode: 'rm'
  };
  const options: AsyncItTransformerOptions = Object.assign({ ...defaultOptions }, userOptions);

  const itFuncCalls = asyncItAstTransformer(j, root, options);
  return itFuncCalls.size() > 0 ? root.toSource({ lineTerminator: '\n', quote: 'single' }) : null;
}
