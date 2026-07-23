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

