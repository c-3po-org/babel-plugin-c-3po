import { createMacro, MacroError } from 'babel-plugin-macros';
import { FUNC_TO_ALIAS_MAP, ALIAS_TO_FUNC_MAP } from './defaults';
import plugin from './plugin';

function ttagMacro({ references, state, babel: { types: t }, config = {} }) {
    const program = state.file.path;

    // replace `babel-plugin-ttag/macro` by `ttag`, add create a node for ttag's imports
    const imports = t.importDeclaration([], t.stringLiteral('ttag'));
    // then add it to top of the document
    program.node.body.unshift(imports);

    // references looks like:
    // { default: [path, path], t: [path], ... }
    Object.keys(references).forEach((refName) => {
        if (!ALIAS_TO_FUNC_MAP[refName]) {
            const allowedMethods = Object.values(FUNC_TO_ALIAS_MAP).map((funcName) => (
                Array.isArray(funcName)
                    ? funcName.join(', ')
                    : funcName
            ));

            throw new MacroError(
                `Invalid import: ${refName}. You can only import ${
                    allowedMethods.join(', ')} from 'babel-plugin-ttag/macro'.`
            );
        }

        // generate new identifier and add to imports
        let id;
        if (refName === 'default') {
            id = program.scope.generateUidIdentifier('ttag');
            imports.specifiers.push(t.importDefaultSpecifier(id));
        } else {
            id = program.scope.generateUidIdentifier(refName);
            imports.specifiers.push(t.importSpecifier(id, t.identifier(refName)));
        }

        // update references with the new identifiers
        references[refName].forEach((referencePath) => {
            referencePath.node.name = id.name;
        });
    });

    // apply babel-plugin-ttag to the file
    const stateWithOpts = { ...state, opts: config };
    program.traverse(plugin().visitor, stateWithOpts);
}

export default createMacro(ttagMacro, { configName: 'ttag' });
