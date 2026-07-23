# Source Maps Options


# Background 


## What are Source Maps?


A **source map** is a file (typically ending with `.map`) that maps compiled or bundled code back to the original source code. This enables browser developer tools to display the original source files while the application executes the transformed bundle.


Source maps improve the debugging experience without affecting the functionality of the application. Different source map configurations offer different trade-offs between **build speed**, **bundle size**, and **debugging quality**.


---


# Source Map Types


## 1. `source-map`


`source-map` is the standard option for production builds and generates a separate source map file.


### How it works


Webpack generates an external `.map` file containing all mapping information. The generated JavaScript bundle includes a reference such as:


```javascript
//# sourceMappingURL=bundle.js.map
```


The browser downloads the source map only when Developer Tools are opened.


### Advantages

- Produces the most accurate source maps.
- Includes both line and column mappings.
- Does not increase the size of the JavaScript bundle.
- Compatible with all modern browsers and debugging tools.

### Disadvantages

- Slower build times because the source map must be generated separately.
- Requires an additional network request when debugging.

### Recommended Usage

- Production builds
- Staging environments
- Applications requiring high-quality debugging information

---


## 2. `eval-source-map`


`eval-source-map` is commonly used during development because it provides a good balance between build performance and debugging quality.


### How it works


Each module is wrapped inside an `eval()` call, and the source map is embedded as a Data URL within that module.


### Advantages

- Faster rebuilds than `source-map`.
- No additional network requests.
- Good debugging experience with accurate line and column mappings.
- Works well with Hot Module Replacement (HMR).

### Disadvantages

- Increases bundle size because the source maps are embedded directly into the JavaScript.
- Uses `eval()`, which may not be suitable in environments with strict Content Security Policies.
- Slight runtime overhead due to `eval()`, although this is generally negligible during development.

### Recommended Usage

- Local development
- HMR workflows
- Projects where debugging quality is important

---


## 3. `eval`


`eval` is the fastest source map configuration but provides the poorest debugging experience.


### How it works


Each module is wrapped in an `eval()` call. Unlike `eval-source-map`, no actual source map is generated. Instead, Webpack adds `sourceURL` comments to help identify module names.


### Advantages

- Fastest build and rebuild times.
- No additional network requests.
- Minimal processing overhead during compilation.

### Disadvantages

- Poor debugging experience.
- Breakpoints can be unreliable.
- Original source locations are difficult to inspect.
- Bundle size is still larger than normal due to `eval()` wrappers.

### Recommended Usage

- Very early development
- Rapid experimentation
- Situations where build speed is more important than debugging

It is generally **not recommended** for regular development or production.


---


# Analysis


## Comparison


| Property                   | `source-map`    | `eval-source-map` | `eval`        |
| -------------------------- | --------------- | ----------------- | ------------- |
| Build Speed                | Slow            | Fast              | Fastest       |
| Debugging Quality          | Excellent       | Good              | Poor          |
| Bundle Size                | Small           | Large             | Medium        |
| Additional Network Request | Yes (.map file) | No                | No            |
| Typical Usage              | Production      | Development       | Quick testing |


---


## Build Performance Considerations


Each source map option makes different trade-offs.


### `source-map`

- Performs additional work during compilation to generate a complete external mapping.
- Produces the slowest build times.
- Keeps the production bundle size small.
- Recommended when debugging production issues.

### `eval-source-map`

- Embeds source maps directly inside the JavaScript bundle.
- Avoids generating external `.map` files.
- Provides significantly faster incremental builds.
- Offers an excellent debugging experience for development.

### `eval`

- Performs almost no source map generation.
- Produces the fastest compilation.
- Sacrifices debugging quality for speed.

---


## Memory Considerations


One important difference between `eval-source-map` and external source maps is memory usage.


With **`eval-source-map`**, every module contains its own embedded source map inside an `eval()` wrapper. For applications with thousands of modules, this significantly increases the size of the generated JavaScript bundle.


As a result:

- More JavaScript must be parsed by the browser.
- The browser keeps the embedded source map data in memory.
- Node.js and Webpack may consume additional memory during development builds.
- Large applications can experience noticeably higher memory usage compared to external source maps.

In contrast, **`source-map`** stores mapping information in separate `.map` files that are downloaded only when Developer Tools are opened, reducing the memory footprint of the application during normal execution.


---


## Observations

- `source-map` provides the highest debugging quality but has the slowest build time.
- `eval-source-map` offers the best balance between build speed and debugging during development.
- `eval` provides the fastest builds but significantly reduces debugging capabilities.
- For large applications, embedded source maps (`eval-source-map`) can substantially increase memory usage.

---


# Recommendations


## Summary

- Use **`source-map`** for production and staging builds where accurate debugging is required.
- Use **`eval-source-map`** for development when a good balance between build speed and debugging is desired.
- Use **`eval`** only for quick experimentation or scenarios where debugging is not important.

For most projects:


| Environment       | Recommended Option |
| ----------------- | ------------------ |
| Production        | `source-map`       |
| Staging           | `source-map`       |
| Development       | `eval-source-map`  |
| Quick experiments | `eval`             |


---


# Conclusion


Selecting the appropriate source map strategy depends on the project's priorities.

- If debugging accuracy is the highest priority, **`source-map`** is the preferred option.
- If development productivity is the priority, **`eval-source-map`** provides the best balance between build performance and debugging quality.
- If maximum build speed is required and debugging is not a concern, **`eval`** is the fastest option but should only be used for temporary development scenarios.


---

# LightningCSS Performance POC


# Background


Our application contains a large SCSS/CSS codebase. Reducing the time spent processing stylesheets could improve both development and production build performance.


Lightning CSS provides two primary capabilities:

- CSS transformation
- CSS minification

To evaluate whether Lightning CSS could improve our build performance, we analyzed our existing CSS processing pipeline and compared it with a Lightning CSS–based pipeline.


---


# Current CSS Processing Pipeline


## SCSS Files


```plain text
afxSassLoader (pre)
    ↓
sass-loader
    ↓
afxSassLoader (post)
    ↓
resolve-url-loader
    ↓
postcss-loader
    ↓
css-loader
    ↓
style-loader (Development)
/ MiniCssExtractPlugin (Production)
```


## CSS Files


```plain text
postcss-loader
    ↓
css-loader
    ↓
style-loader (Development)
/ MiniCssExtractPlugin (Production)
```


---


# Current Processing Flow


Our applications primarily use **SCSS** rather than plain CSS.


The processing flow is as follows:

1. **afxSassLoader (pre)** injects framework-specific SCSS variables such as `AFX_MODULE_SCSS_PATHS`.
2. **sass-loader** compiles SCSS into CSS.
3. **afxSassLoader (post)** performs additional processing, such as rewriting image URLs.
4. **resolve-url-loader** resolves relative asset paths correctly, especially when SCSS files import other SCSS files.
5. **postcss-loader** transforms the generated CSS using several PostCSS plugins.
6. **css-loader** resolves `@import` and `url()` statements, handles CSS Modules, and passes the processed CSS into Webpack's asset pipeline.
7. **style-loader** injects styles into the browser during development.
8. **MiniCssExtractPlugin** extracts CSS into separate files for production builds.

---


# PostCSS Plugins Currently Used


Our PostCSS configuration uses the following plugins:


| Plugin                   | Purpose                                                                         | Lightning CSS Support                                                                                |
| ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `postcss-flexbugs-fixes` | Fixes known Flexbox implementation bugs in older browsers                       | ❌ Not supported                                                                                      |
| `postcss-normalize`      | Injects browser-specific CSS normalization based on the configured Browserslist | ❌ Not supported                                                                                      |
| `postcss-preset-env`     | Transforms modern CSS syntax and applies vendor prefixes                        | ⚠️ Partially supported (Lightning CSS provides autoprefixing and several modern CSS transformations) |


Because Lightning CSS does not fully replace all PostCSS functionality, it cannot completely replace `postcss-loader` in our pipeline without losing some existing behavior.


---


# Scope of the POC


For this proof of concept:

- `postcss-loader` was temporarily replaced with `lightningcss-loader`, ignoring unsupported PostCSS plugins.
- We also evaluated replacing the existing **esbuild CSS minifier** with the **Lightning CSS minifier**.

The existing CSS minifier is based on **esbuild** (written in Go), while Lightning CSS is implemented in **Rust**. Both are highly optimized, so only marginal performance differences were expected.


---


# Analysis


## Build Time Comparison


| Application      | Configuration                          | Build Time (seconds) |
| ---------------- | -------------------------------------- | -------------------- |
| Sample App       | Current (PostCSS + esbuild)            | 60–70                |
| Sample App       | Lightning CSS + esbuild                | 60–70                |
| Sample App       | Lightning CSS + Lightning CSS Minifier | 60–70                |
| Active Workspace | Current (PostCSS + esbuild)            | 370                  |
| Active Workspace | PostCSS + Lightning CSS Minifier       | 420                  |
| Active Workspace | Lightning CSS + Lightning CSS Minifier | 450                  |


---


## Observations

- No measurable improvement was observed for the sample application.
- In the Active Workspace application, replacing PostCSS and/or the CSS minifier actually increased the total build time.
- The results indicate that **CSS processing is not the primary build-time bottleneck**.
- The current PostCSS stage already performs efficiently within our existing pipeline.
- Replacing it with Lightning CSS does not provide any measurable performance benefit for our use case.
- The Lightning CSS minifier also did not outperform the existing esbuild-based minifier.

---


## Why Did the Build Time Increase?


Although Lightning CSS is highly optimized, replacing the existing CSS processing pipeline resulted in **slightly longer build times**. This is likely due to a combination of the following factors:


### 1. N-API Overhead Across Many Files


Lightning CSS is implemented in Rust and communicates with Node.js through **N-API**. While individual CSS transformations are very fast, projects with large SCSS dependency graphs require thousands of transformations. The repeated JavaScript ↔ native boundary crossings introduce additional overhead, which can offset the performance gains of the native implementation.


### 2. The Most Expensive Processing Stages Remain Unchanged


Replacing `postcss-loader` does not remove the more expensive stages of the pipeline. The following components are still executed for every SCSS file:

- `afxSassLoader` (pre-processing)
- `sass-loader`
- `afxSassLoader` (post-processing)
- `resolve-url-loader`

If these stages account for most of the CSS processing time, optimizing the PostCSS stage provides little overall benefit. In this case, the additional overhead introduced by Lightning CSS results in a net increase in build time.


### 3. PostCSS Was Not the Bottleneck


The POC indicates that our existing PostCSS configuration is already relatively lightweight. Although it performs several CSS transformations, its contribution to the overall build time is small compared to the rest of the pipeline.


As a result, replacing PostCSS removes only a small amount of work while introducing integration overhead.


### 4. Differences in Minifier Integration


Our existing build uses the **esbuild CSS minifier**, which is already highly optimized and well integrated into the current Webpack pipeline.


Replacing it with the Lightning CSS minifier changes how CSS assets are processed during optimization. Differences in asset handling, parallelization, caching, and optimization phases can result in a slower overall build, even if the minification step itself is fast.


### 5. Cache Efficiency


Changing loaders and minifiers can alter Webpack's caching behavior. In large projects, this may reduce cache hit rates during builds or rebuilds, causing additional work to be performed and increasing overall build time.


### Summary


Lightning CSS itself is **not inherently slower** than the existing solution. However, in our current Webpack pipeline:

- CSS processing is **not the primary build-time bottleneck**.
- The expensive SCSS compilation and URL resolution stages remain unchanged.
- The performance gains from replacing PostCSS are too small to outweigh the additional integration overhead.
- Changes in optimization and caching behavior can further increase total build time.

Therefore, while Lightning CSS is an excellent standalone CSS processor, it does **not** provide a build-time advantage for our current project architecture.


---


# Conclusion


Based on the results of this proof of concept:

- Replacing `postcss-loader` with `lightningcss-loader` does **not** improve build performance.
- Replacing the existing esbuild CSS minifier with the Lightning CSS minifier also does **not** provide any measurable benefit.
- The existing CSS processing pipeline is already efficient.
- Future optimization efforts should focus on stages that contribute significantly more to build time, such as:
    - SCSS compilation (`sass-loader`)
    - Custom AFX loaders
    - Module resolution
    - JavaScript compilation
    - Webpack plugins
    - Asset processing

---


# Recommendations

- Continue using the existing **PostCSS + esbuild** pipeline.
- Do not migrate to Lightning CSS solely for build performance improvements.
- Use Webpack profiling tools (such as `SpeedMeasurePlugin`, profiling builds, and Chrome Tracing) to identify the actual build bottlenecks before replacing existing tooling.
- Consider Lightning CSS in the future if:
    - additional PostCSS plugins become unnecessary,
    - project requirements align better with its feature set, or
    - future releases improve its integration performance.

---


# Implementation


No implementation is recommended based on the findings of this POC.


Future optimization work should focus on profiling and improving the stages that consume the majority of build time rather than replacing an already efficient CSS processing pipeline.

