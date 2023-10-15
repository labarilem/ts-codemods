import { API, ArrowFunctionExpression, CallExpression, FileInfo, FunctionExpression, Identifier, MemberExpression } from 'jscodeshift';
import { AsyncItTransformerOptions, asyncItAstTransformer } from './async-it';

// DOC: to check AST node types use https://astexplorer.net/
// then:
// 1. set the transformer to "recast"
// 2. in "settings", set "typescript" as the parser

export default function asyncSupertestTransformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const options: AsyncItTransformerOptions = {
    describeFuncName: 'describe',
    itFuncName: 'it',
    skipFuncName: 'skip',
    doneFuncName: 'done',
    rmDoneFunc: true,
    rmDoneFuncMode: 'rm'
  };

  const endFuncName = 'end';

  // make 'it' func args async and remove all 'done' func calls
  const itFuncCalls = asyncItAstTransformer(j, root, options);

  itFuncCalls
    // find calls to an '.end' property inside the 'it' func arg body
    // we also require that the object exposting the 'end' prop is the
    // result of another call expression, as it's usually the case with supertest
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: {
          name: endFuncName
        },
        object: {
          type: 'CallExpression'
        }
      },
    })
    // also run checks on the 'end' func args
    .forEach(call => {
      // replacing funcs can trigger another loop iteration so we need to filter
      // inside the loop for calls to the 'end' func
      if (call.node.arguments.length !== 1 ||
        (call.node.arguments[0].type !== 'FunctionExpression' &&
          call.node.arguments[0].type !== 'ArrowFunctionExpression') ||
        call.node.arguments[0].async ||
        call.node.arguments[0].params.length !== 2 ||
        (call.node.arguments[0] as FunctionExpression | ArrowFunctionExpression)
          .params.some(x => x.type !== 'Identifier'))
        return;

      const endFuncArg = call.node.arguments[0] as FunctionExpression;

      // find 'err' and 'res' args name by their position
      const errArgName = (endFuncArg.params[0] as Identifier).name;
      const resArgName = (endFuncArg.params[1] as Identifier).name;

      // remove the typical 'if (err) return;' statement
      j(endFuncArg.body)
        .find(j.IfStatement, {
          test: {
            type: 'Identifier',
            name: errArgName
          }
        })
        .remove();

      const itFuncArgBody = call.parent.parent.node.body as any[];

      // extract the body to the outer function
      // i.e. the 'it' function
      for (const statement of endFuncArg.body.body) {
        itFuncArgBody.push(statement);
      }

      // create new async call and respective result assignment
      const baseCall = (call.node.callee as MemberExpression).object as CallExpression;
      const assignAsyncResult = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier(resArgName),
          j.awaitExpression(baseCall)
        )
      ]);

      // remove only the '.end' part of the fluent call chain
      // we do this by replacing the whole call with a subset of the call chain
      j(call).replaceWith(assignAsyncResult);
    });

  return itFuncCalls.size() > 0 ? root.toSource({ lineTerminator: '\n', quote: 'single' }) : null;
}
