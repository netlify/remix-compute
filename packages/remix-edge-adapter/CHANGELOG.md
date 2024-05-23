# Changelog

## [3.3.0](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v3.2.4...remix-edge-adapter-v3.3.0) (2024-05-23)


### Features

* **deps:** bump Remix dependencies ([#339](https://github.com/netlify/remix-compute/issues/339)) ([2a82244](https://github.com/netlify/remix-compute/commit/2a82244023fcda7a8579d5c295211a0b1b0c032d))


### Bug Fixes

* **deps:** update dependency isbot to v5 ([#326](https://github.com/netlify/remix-compute/issues/326)) ([252ba6f](https://github.com/netlify/remix-compute/commit/252ba6fb0b70cdd1d81db49cbcd640d7aee5762c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @netlify/remix-runtime bumped from 2.2.1 to 2.3.0

## [3.2.4](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v3.2.3...remix-edge-adapter-v3.2.4) (2024-05-17)


### Bug Fixes

* require node 18 like remix itself ([#212](https://github.com/netlify/remix-compute/issues/212)) ([cf05c1e](https://github.com/netlify/remix-compute/commit/cf05c1e22709531410f2bb574994319785c08c2d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @netlify/remix-runtime bumped from 2.2.0 to 2.2.1

## [3.2.3](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v3.2.2...remix-edge-adapter-v3.2.3) (2024-05-13)


### Bug Fixes

* **edge:** externalize node builtins ([#317](https://github.com/netlify/remix-compute/issues/317)) ([521bfee](https://github.com/netlify/remix-compute/commit/521bfee7115186fc934ffdc7f579ea44fa8803b6))

## [3.2.2](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v3.2.1...remix-edge-adapter-v3.2.2) (2024-04-20)


### Bug Fixes

* **remix-edge-adapter:** exclude /.netlify paths from edge function ([#296](https://github.com/netlify/remix-compute/issues/296)) ([09bf62b](https://github.com/netlify/remix-compute/commit/09bf62b9c847fe6d50cc4baa999253f409f547b0))

## [3.2.1](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v3.2.0...remix-edge-adapter-v3.2.1) (2024-04-03)


### Bug Fixes

* Use posix path in import when building on windows ([#281](https://github.com/netlify/remix-compute/issues/281)) ([64455ed](https://github.com/netlify/remix-compute/commit/64455ed617bd7caca59788aa5c31f257cab96540))

## [3.2.0](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v3.1.0...remix-edge-adapter-v3.2.0) (2024-02-21)


### Features

* add support for Vite ([#251](https://github.com/netlify/remix-compute/issues/251)) ([a32191c](https://github.com/netlify/remix-compute/commit/a32191c58525006f8ecf5cb72e662f88e229c9ad))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @netlify/remix-runtime bumped to 2.2.0

## [3.1.0](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v3.0.0...remix-edge-adapter-v3.1.0) (2023-10-30)


### Features

* export the default 'handleRequest' from adapters ([#204](https://github.com/netlify/remix-compute/issues/204)) ([12054d8](https://github.com/netlify/remix-compute/commit/12054d8f4d14d1c8942dc71c96734c0d8d09181d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @netlify/remix-runtime bumped from 2.0.0 to 2.1.0

## [3.0.0](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v2.0.0...remix-edge-adapter-v3.0.0) (2023-10-19)


### ⚠ BREAKING CHANGES

* upgrade to Remix 2 ([#191](https://github.com/netlify/remix-compute/issues/191))

### Features

* upgrade to Remix 2 ([#191](https://github.com/netlify/remix-compute/issues/191)) ([81b169f](https://github.com/netlify/remix-compute/commit/81b169f1a796fddc7dfdc97d83ec01116fd7c3fb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @netlify/remix-runtime bumped from * to 2.0.0

## [2.0.0](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v1.2.0...remix-edge-adapter-v2.0.0) (2023-06-29)


### ⚠ BREAKING CHANGES

* **remix-edge-adapter:** update default config ([#115](https://github.com/netlify/remix-compute/issues/115))
* **remix-edge-adapter:** update default config ([#84](https://github.com/netlify/remix-compute/issues/84))

### Features

* **remix-edge-adapter:** update default config ([#115](https://github.com/netlify/remix-compute/issues/115)) ([b5e35b2](https://github.com/netlify/remix-compute/commit/b5e35b221b7ec979de70b38f45a26381444ecae0))
* **remix-edge-adapter:** update default config ([#84](https://github.com/netlify/remix-compute/issues/84)) ([bed0399](https://github.com/netlify/remix-compute/commit/bed0399bac3d09fc270fcbed482e2288254daf4d))

## [1.2.0](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v1.1.0...remix-edge-adapter-v1.2.0) (2023-03-24)


### Features

* moved away from deprecated serverBuildTarget ([#63](https://github.com/netlify/remix-compute/issues/63)) ([376378f](https://github.com/netlify/remix-compute/commit/376378f4d4fc8b51ad22a71cb7526ad3f3b23633))

## [1.1.0](https://github.com/netlify/remix-compute/compare/remix-edge-adapter-v1.0.0...remix-edge-adapter-v1.1.0) (2023-03-13)


### Features

* moved to Remix routing v2 ([#61](https://github.com/netlify/remix-compute/issues/61)) ([4aae8ce](https://github.com/netlify/remix-compute/commit/4aae8cec20f604d6c306245d7b7645b65a36be4d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @netlify/remix-runtime bumped from ^1.0.0 to ^1.1.0

## 1.0.0 (2023-02-13)


### Features

* implemented Remix server adapter and runtime for Netlify ([#16](https://github.com/netlify/remix-compute/issues/16)) ([9efc5cf](https://github.com/netlify/remix-compute/commit/9efc5cfe75b9bffb78b2af5ca9d8b3828cf3278f))
