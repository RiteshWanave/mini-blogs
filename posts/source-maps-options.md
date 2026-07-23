# Source Maps Options


# Background s


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
