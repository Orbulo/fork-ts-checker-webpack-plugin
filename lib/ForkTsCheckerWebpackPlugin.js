"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_utils_1 = __importDefault(require("schema-utils"));
const cosmiconfig_1 = require("cosmiconfig");
const deepmerge_1 = __importDefault(require("deepmerge"));
const ForkTsCheckerWebpackPluginOptions_json_1 = __importDefault(require("./ForkTsCheckerWebpackPluginOptions.json"));
const ForkTsCheckerWebpackPluginConfiguration_1 = require("./ForkTsCheckerWebpackPluginConfiguration");
const ForkTsCheckerWebpackPluginState_1 = require("./ForkTsCheckerWebpackPluginState");
const reporter_1 = require("./reporter");
const TypeScriptSupport_1 = require("./typescript-reporter/TypeScriptSupport");
const TypeScriptReporterRpcClient_1 = require("./typescript-reporter/reporter/TypeScriptReporterRpcClient");
const assertEsLintSupport_1 = require("./eslint-reporter/assertEsLintSupport");
const EsLintReporterRpcClient_1 = require("./eslint-reporter/reporter/EsLintReporterRpcClient");
const tapStartToConnectAndRunReporter_1 = require("./hooks/tapStartToConnectAndRunReporter");
const tapStopToDisconnectReporter_1 = require("./hooks/tapStopToDisconnectReporter");
const tapAfterCompileToAddDependencies_1 = require("./hooks/tapAfterCompileToAddDependencies");
const tapErrorToLogMessage_1 = require("./hooks/tapErrorToLogMessage");
const pluginHooks_1 = require("./hooks/pluginHooks");
const tapAfterEnvironmentToPatchWatching_1 = require("./hooks/tapAfterEnvironmentToPatchWatching");
const pool_1 = require("./utils/async/pool");
const os_1 = __importDefault(require("os"));
class ForkTsCheckerWebpackPlugin {
    constructor(options = {}) {
        const explorerSync = cosmiconfig_1.cosmiconfigSync('fork-ts-checker');
        const { config: externalOptions } = explorerSync.search() || {};
        // first validate options directly passed to the constructor
        const configuration = { name: 'ForkTsCheckerWebpackPlugin' };
        schema_utils_1.default(ForkTsCheckerWebpackPluginOptions_json_1.default, options, configuration);
        this.options = deepmerge_1.default(externalOptions || {}, options || {});
        // then validate merged options
        schema_utils_1.default(ForkTsCheckerWebpackPluginOptions_json_1.default, this.options, configuration);
    }
    static getCompilerHooks(compiler) {
        return pluginHooks_1.getForkTsCheckerWebpackPluginHooks(compiler);
    }
    apply(compiler) {
        const configuration = ForkTsCheckerWebpackPluginConfiguration_1.createForkTsCheckerWebpackPluginConfiguration(compiler, this.options);
        const state = ForkTsCheckerWebpackPluginState_1.createForkTsCheckerWebpackPluginState();
        const reporters = [];
        if (configuration.typescript.enabled) {
            TypeScriptSupport_1.assertTypeScriptSupport(configuration.typescript);
            reporters.push(TypeScriptReporterRpcClient_1.createTypeScriptReporterRpcClient(configuration.typescript));
        }
        if (configuration.eslint.enabled) {
            assertEsLintSupport_1.assertEsLintSupport(configuration.eslint);
            reporters.push(EsLintReporterRpcClient_1.createEsLintReporterRpcClient(configuration.eslint));
        }
        if (reporters.length) {
            const reporter = reporter_1.createAggregatedReporter(reporter_1.composeReporterRpcClients(reporters));
            tapAfterEnvironmentToPatchWatching_1.tapAfterEnvironmentToPatchWatching(compiler, state);
            tapStartToConnectAndRunReporter_1.tapStartToConnectAndRunReporter(compiler, reporter, configuration, state);
            tapAfterCompileToAddDependencies_1.tapAfterCompileToAddDependencies(compiler, configuration, state);
            tapStopToDisconnectReporter_1.tapStopToDisconnectReporter(compiler, reporter, state);
            tapErrorToLogMessage_1.tapErrorToLogMessage(compiler, configuration);
        }
        else {
            throw new Error(`ForkTsCheckerWebpackPlugin is configured to not use any issue reporter. It's probably a configuration issue.`);
        }
    }
}
exports.ForkTsCheckerWebpackPlugin = ForkTsCheckerWebpackPlugin;
/**
 * Current version of the plugin
 */
ForkTsCheckerWebpackPlugin.version = '{{VERSION}}'; // will be replaced by the @semantic-release/exec
/**
 * Default pool for the plugin concurrency limit
 */
ForkTsCheckerWebpackPlugin.pool = pool_1.createPool(Math.max(1, os_1.default.cpus().length));
