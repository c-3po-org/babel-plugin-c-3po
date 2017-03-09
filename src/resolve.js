import { NoTranslationError, ValidationError } from './errors';
import { dedentStr } from './utils';
import { hasTranslations } from './po-helpers';

export function resolveDefaultEntries(extractor, nodePath, context, state) {
    try {
        extractor.validate(nodePath.node, context);
    } catch (err) {
        if (err instanceof ValidationError) {
            context.validationFailureAction(extractor.name, err.message);
            return;
        }
        throw err;
    }
    if (extractor.resolveDefault) {
        const resultNode = extractor.resolveDefault(nodePath.node, context, state);
        if (resultNode !== undefined) {
            nodePath.replaceWith(resultNode);
        }
    }
}

export function resolveEntries(extractor, nodePath, context, state) {
    try {
        extractor.validate(nodePath.node, context);
    } catch (err) {
        if (err instanceof ValidationError) {
            context.validationFailureAction(extractor.name, err.message);
            return;
        }
        throw err;
    }

    try {
        const translations = context.getTranslations();
        const msgid = context.isDedent() ? dedentStr(extractor.getMsgid(nodePath.node)) :
            extractor.getMsgid(nodePath.node);
        const translationObj = translations[msgid];

        if (!translationObj) {
            throw new NoTranslationError(`No "${msgid}" in "${context.getPoFilePath()}" file`);
        }

        if (!hasTranslations(translationObj)) {
            throw new NoTranslationError(`No translation for "${msgid}" in "${context.getPoFilePath()}" file`);
        }

        const resultNode = extractor.resolve(nodePath.node, translationObj, context, state);
        if (resultNode !== undefined) {
            nodePath.replaceWith(resultNode);
        }
    } catch (err) {
        if (err instanceof NoTranslationError) {
            context.noTranslationAction(err.message);
            if (extractor.resolveDefault) {
                const resultNode = extractor.resolveDefault(nodePath.node, context, state);
                if (resultNode !== undefined) {
                    nodePath.replaceWith(resultNode);
                }
            }
            return;
        }
        throw err;
    }
}
