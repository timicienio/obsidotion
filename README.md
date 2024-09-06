# Obsidotion 2
A simple obsidian plugin that syncs from/to obsidian/notion. Works on all platforms.

# How to install manually

1. Clone the repo inside `your_obsidian_vault/.obsidian/plugins`
2. Go to the folder
3. Run `yarn`
4. Run `yarn build`
5. Open obsidian
6. Reload community plugins
7. Enable the plugin

# How to use

1. Follow instructions on [https://github.com/EasyChris/obsidian-to-notion] to create Notion plugin, acquire Notion access token, and the ID(s) of your Notion database(s) you wish to import/export notes to/from.
2. Fill in information in plugin settings page.

# Limitations

- Content on the destination side of import/export sync will be rewritten by source content. Be careful when performing these actions.
- Nested folder in export folder will not be sync to Notion.

# Acknowledgment

Thanks to [p32929](https://github.com/p32929), the original author of obsidotion, for providing the groundwork for this project.

# License
```
MIT License

Copyright (c) 2024 Fayaz Bin Salam

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

