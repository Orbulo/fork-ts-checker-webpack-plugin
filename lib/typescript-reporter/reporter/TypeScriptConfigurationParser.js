"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("typescript"));
const path_1 = require("path");
function parseTypeScriptConfiguration(typescript, configFileName, configFileContext, configOverwriteJSON, parseConfigFileHost) {
    const parsedConfigFileJSON = typescript.readConfigFile(configFileName, parseConfigFileHost.readFile);
    const overwrittenConfigFileJSON = Object.assign(Object.assign(Object.assign({}, (parsedConfigFileJSON.config || {})), configOverwriteJSON), { compilerOptions: Object.assign(Object.assign({}, ((parsedConfigFileJSON.config || {}).compilerOptions || {})), (configOverwriteJSON.compilerOptions || {})) });
    const parsedConfigFile = typescript.parseJsonConfigFileContent(overwrittenConfigFileJSON, parseConfigFileHost, configFileContext);
    return Object.assign(Object.assign({}, parsedConfigFile), { options: Object.assign(Object.assign({}, parsedConfigFile.options), { configFilePath: configFileName }), errors: parsedConfigFileJSON.error ? [parsedConfigFileJSON.error] : parsedConfigFile.errors });
}
exports.parseTypeScriptConfiguration = parseTypeScriptConfiguration;
function getDependenciesFromTypeScriptConfiguration(typescript, parsedConfiguration, parseConfigFileHost, processedConfigFiles = []) {
    const files = new Set(parsedConfiguration.fileNames);
    if (typeof parsedConfiguration.options.configFilePath === 'string') {
        files.add(parsedConfiguration.options.configFilePath);
    }
    const dirs = new Set(Object.keys(parsedConfiguration.wildcardDirectories || {}));
    for (const projectReference of parsedConfiguration.projectReferences || []) {
        const configFile = typescript.resolveProjectReferencePath(projectReference);
        if (processedConfigFiles.includes(configFile)) {
            // handle circular dependencies
            continue;
        }
        const parsedConfiguration = parseTypeScriptConfiguration(typescript, configFile, path_1.dirname(configFile), {}, parseConfigFileHost);
        const childDependencies = getDependenciesFromTypeScriptConfiguration(typescript, parsedConfiguration, parseConfigFileHost, [...processedConfigFiles, configFile]);
        childDependencies.files.forEach((file) => {
            files.add(file);
        });
        childDependencies.dirs.forEach((dir) => {
            dirs.add(dir);
        });
    }
    const extensions = [
        typescript.Extension.Ts,
        typescript.Extension.Tsx,
        typescript.Extension.Js,
        typescript.Extension.Jsx,
        typescript.Extension.TsBuildInfo,
    ];
    return {
        files: Array.from(files).map((file) => path_1.normalize(file)),
        dirs: Array.from(dirs).map((dir) => path_1.normalize(dir)),
        extensions: extensions,
    };
}
exports.getDependenciesFromTypeScriptConfiguration = getDependenciesFromTypeScriptConfiguration;
function isIncrementalCompilation(options) {
    return Boolean((options.incremental || options.composite) && !options.outFile);
}
exports.isIncrementalCompilation = isIncrementalCompilation;
function removeJsonExtension(path) {
    if (path.endsWith('.json')) {
        return path.slice(0, -'.json'.length);
    }
    else {
        return path;
    }
}
function getTsBuildInfoEmitOutputFilePath(options) {
    if (typeof ts.getTsBuildInfoEmitOutputFilePath === 'function') {
        // old TypeScript version doesn't provides this method
        return ts.getTsBuildInfoEmitOutputFilePath(options);
    }
    // based on the implementation from typescript
    const configFile = options.configFilePath;
    if (!isIncrementalCompilation(options)) {
        return undefined;
    }
    if (options.tsBuildInfoFile) {
        return options.tsBuildInfoFile;
    }
    const outPath = options.outFile || options.out;
    let buildInfoExtensionLess;
    if (outPath) {
        buildInfoExtensionLess = removeJsonExtension(outPath);
    }
    else {
        if (!configFile) {
            return undefined;
        }
        const configFileExtensionLess = removeJsonExtension(configFile);
        buildInfoExtensionLess = options.outDir
            ? options.rootDir
                ? path_1.resolve(options.outDir, path_1.relative(options.rootDir, configFileExtensionLess))
                : path_1.resolve(options.outDir, path_1.basename(configFileExtensionLess))
            : configFileExtensionLess;
    }
    return buildInfoExtensionLess + '.tsbuildinfo';
}
function getArtifactsFromTypeScriptConfiguration(typescript, parsedConfiguration, configFileContext, parseConfigFileHost, processedConfigFiles = []) {
    const files = new Set();
    const dirs = new Set();
    if (parsedConfiguration.fileNames.length > 0) {
        if (parsedConfiguration.options.outFile) {
            files.add(path_1.resolve(configFileContext, parsedConfiguration.options.outFile));
        }
        const tsBuildInfoPath = getTsBuildInfoEmitOutputFilePath(parsedConfiguration.options);
        if (tsBuildInfoPath) {
            files.add(path_1.resolve(configFileContext, tsBuildInfoPath));
        }
        if (parsedConfiguration.options.outDir) {
            dirs.add(path_1.resolve(configFileContext, parsedConfiguration.options.outDir));
        }
    }
    for (const projectReference of parsedConfiguration.projectReferences || []) {
        const configFile = typescript.resolveProjectReferencePath(projectReference);
        if (processedConfigFiles.includes(configFile)) {
            // handle circular dependencies
            continue;
        }
        const parsedConfiguration = parseTypeScriptConfiguration(typescript, configFile, path_1.dirname(configFile), {}, parseConfigFileHost);
        const childArtifacts = getArtifactsFromTypeScriptConfiguration(typescript, parsedConfiguration, configFileContext, parseConfigFileHost, [...processedConfigFiles, configFile]);
        childArtifacts.files.forEach((file) => {
            files.add(file);
        });
        childArtifacts.dirs.forEach((dir) => {
            dirs.add(dir);
        });
    }
    const extensions = [
        typescript.Extension.Dts,
        typescript.Extension.Js,
        typescript.Extension.TsBuildInfo,
    ];
    return {
        files: Array.from(files).map((file) => path_1.normalize(file)),
        dirs: Array.from(dirs).map((dir) => path_1.normalize(dir)),
        extensions,
    };
}
exports.getArtifactsFromTypeScriptConfiguration = getArtifactsFromTypeScriptConfiguration;
