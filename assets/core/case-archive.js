/* Archive cases use the same File reader and validation as folder imports.
   fflate 0.8.3 and libarchive.js 2.0.2 (MIT); runtimes are bundled locally. */
(function (global) {
  'use strict';

  function archivePath(name) {
    name = name.replace(/\\/g, '/');
    if (/^(\/|[a-z]:)/i.test(name) || name.split('/').some(function (p) { return p === '..'; })) {
      throw new Error('压缩包包含无效路径：' + name);
    }
    return name.split('/').filter(function (p) { return p && p !== '.'; }).join('/');
  }

  function ignored(name) {
    return /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i.test(name) || /\/$/.test(name);
  }

  async function readNative(file, maxBytes) {
    var worker, timer;
    var entries = Object.create(null);
    try {
      var module = await import('../vendor/libarchive/libarchive.js');
      var failed = new Promise(function (resolve, reject) {
        timer = setTimeout(function () { reject(new Error('解压超时，请检查压缩包是否完整或已加密。')); }, 30000);
        module.Archive.init({ getWorker: function () {
          worker = new Worker(new URL('assets/vendor/libarchive/worker-bundle.js', document.baseURI), { type: 'module' });
          worker.onerror = function () { reject(new Error('解压组件运行失败，请刷新页面后重试。')); };
          return worker;
        } });
      });
      var extract = async function () {
        var archive = await module.Archive.open(file);
        try {
          if (await archive.hasEncryptedData()) throw new Error('暂不支持加密压缩包，请去除密码后导入。');
          var files = await archive.getFilesArray(), total = 0;
          files.forEach(function (entry) {
            var name = entry.path + entry.file.name;
            if (ignored(name)) return;
            archivePath(name);
            total += entry.file.size;
            if (total > maxBytes) throw new Error('解压后超过 6 MB，请先精简图片或其他素材。');
          });
          if (await archive.hasEncryptedData()) throw new Error('暂不支持加密压缩包，请去除密码后导入。');
          await archive.extractFiles();
          files = await archive.getFilesArray();
          total = 0;
          for (var entry of files) {
            var name = entry.path + entry.file.name;
            if (ignored(name)) continue;
            total += entry.file.size;
            if (total > maxBytes) throw new Error('解压后超过 6 MB，请先精简图片或其他素材。');
            entries[name] = new Uint8Array(await entry.file.arrayBuffer());
          }
          return entries;
        } finally { await archive.close(); }
      };
      return await Promise.race([extract(), failed]);
    } catch (e) {
      throw new Error('压缩包解压失败：' + e.message + ' 请使用完整、未加密的单个压缩包。');
    } finally {
      clearTimeout(timer);
      if (worker) worker.terminate();
    }
  }

  function read(file, maxBytes) {
    return Promise.resolve().then(function () {
      if (!/\.(zip|rar|7z)$/i.test(file.name)) throw new Error('请选择 ZIP、RAR 或 7z 压缩包。');
      if (file.size > maxBytes) throw new Error('压缩包太大，上限 6 MB（解压后也不能超过 6 MB）。');
      return file.arrayBuffer();
    }).then(function (buffer) {
      if (!/\.zip$/i.test(file.name)) {
        var signature = Array.from(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 6))).join(',');
        var expected = /\.rar$/i.test(file.name) ? '82,97,114,33,26,7' : '55,122,188,175,39,28';
        if (signature !== expected) throw new Error('压缩包格式不正确或文件已损坏。');
        return readNative(file, maxBytes);
      }
      if (!global.fflate) throw new Error('解压组件未加载，请刷新页面后重试。');
      var total = 0, names = Object.create(null), entries;
      try {
        entries = global.fflate.unzipSync(new Uint8Array(buffer), { filter: function (entry) {
          if (ignored(entry.name.replace(/\\/g, '/'))) return false;
          var name = archivePath(entry.name);
          if (!name || names[name]) throw new Error('压缩包包含重复或空文件路径：' + name);
          names[name] = true;
          total += entry.originalSize;
          if (total > maxBytes) throw new Error('解压后超过 6 MB，请先精简图片或其他素材。');
          return true;
        } });
      } catch (e) {
        throw new Error('ZIP 解压失败：' + (e.message || '文件损坏或压缩方式不受支持'));
      }
      return entries;
    }).then(function (entries) {
      var normalized = Object.create(null);
      Object.keys(entries).forEach(function (name) {
        var path = archivePath(name);
        if (normalized[path]) throw new Error('压缩包包含重复文件路径：' + path);
        normalized[path] = entries[name];
      });
      entries = normalized;
      var paths = Object.keys(entries);
      if (!paths.length) throw new Error('压缩包里没有可导入的文件。');
      var manifests = paths.filter(function (name) { return /(^|\/)(case|[a-z0-9._-]+\.case)\.json$/i.test(name); });
      if (manifests.length > 1) throw new Error('压缩包中有多个案例清单，请将每个案例分别打包后逐个导入。');
      // Remove any number of enclosing folders, preserving paths relative to case.json.
      var root = manifests.length ? manifests[0].slice(0, manifests[0].lastIndexOf('/') + 1) : '';
      return paths.filter(function (path) { return !root || path.indexOf(root) === 0; }).map(function (path) {
        var name = archivePath(path.slice(root.length));
        var result = new File([entries[path]], name.split('/').pop());
        Object.defineProperty(result, 'webkitRelativePath', { value: name });
        return result;
      });
    });
  }

  global.CaseArchive = { read: read };
})(window);
