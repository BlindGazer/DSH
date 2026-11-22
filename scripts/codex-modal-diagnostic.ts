(() => {
    const output = [];
    const prefix = '[Codex CSS check]';

    try {
        output.push(`${prefix} Скрипт запущен: ${location.href}`);

        const title = [...document.querySelectorAll('body *')].find(element => (element.textContent || '').trim() === 'OpenAI Codex');

        if (!title) {
            output.push(`${prefix} Текст "OpenAI Codex" не найден в этом документе.`);
            output.push(`Документ: ${(document.body?.textContent || '').slice(0, 500)}`);
            console.log(output.join('\n'));
            return;
        }

        let modal = title;
        for (let element = title; element && element !== document.body; element = element.parentElement) {
            const classes = typeof element.className === 'string' ? element.className : '';
            const role = element.getAttribute('role') || '';
            const ariaModal = element.getAttribute('aria-modal') || '';
            if (/modal|dialog/i.test(`${classes} ${role} ${ariaModal}`)) {
                modal = element;
                break;
            }
        }

        const chain = [];
        for (let element = modal; element && element !== document.documentElement; element = element.parentElement) {
            chain.push(element);
            if (element === document.body) break;
        }

        const elementRows = chain.map((element, depth) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const className = typeof element.className === 'string' ? element.className : '';
            return [
                `ancestor[${depth}] ${element.tagName.toLowerCase()}`,
                `class="${className}" role="${element.getAttribute('role') || ''}"`,
                `rect=${Math.round(rect.width)}x${Math.round(rect.height)} at ${Math.round(rect.x)},${Math.round(rect.y)}`,
                `display=${style.display} position=${style.position} box-sizing=${style.boxSizing}`,
                `width=${style.width} min-width=${style.minWidth} max-width=${style.maxWidth}`,
                `height=${style.height} min-height=${style.minHeight} max-height=${style.maxHeight}`,
                `flex=${style.flex} flex-basis=${style.flexBasis} padding=${style.padding} margin=${style.margin}`,
                `transform=${style.transform} zoom=${style.zoom}`,
                `inline-style="${element.getAttribute('style') || ''}"`
            ].join(' | ');
        });

        const geometryProperties = new Set([
            'all',
            'display',
            'position',
            'box-sizing',
            'width',
            'min-width',
            'max-width',
            'inline-size',
            'height',
            'min-height',
            'max-height',
            'block-size',
            'margin',
            'padding',
            'inset',
            'top',
            'right',
            'bottom',
            'left',
            'flex',
            'flex-basis',
            'flex-grow',
            'flex-shrink',
            'grid',
            'grid-template-columns',
            'transform',
            'zoom'
        ]);
        const matchingRules = [];

        const scanRules = (rules, source) => {
            for (const rule of rules) {
                if (rule.cssRules) {
                    scanRules(rule.cssRules, source);
                    continue;
                }
                if (!rule.selectorText || !rule.style) continue;

                const declarations = [];
                for (let index = 0; index < rule.style.length; index++) {
                    const property = rule.style[index];
                    if (!geometryProperties.has(property)) continue;
                    const priority = rule.style.getPropertyPriority(property);
                    declarations.push(`${property}: ${rule.style.getPropertyValue(property).trim()}${priority ? ' !important' : ''}`);
                }
                if (!declarations.length) continue;

                const depths = [];
                chain.forEach((element, depth) => {
                    try {
                        if (element.matches(rule.selectorText)) depths.push(depth);
                    } catch {}
                });
                if (depths.length) {
                    matchingRules.push(`${source} | ${rule.selectorText} | ancestors=${depths.join(',')} | ${declarations.join('; ')}`);
                }
            }
        };

        for (const sheet of document.styleSheets) {
            const source = sheet.href
                ? sheet.href.split('?')[0].split('#')[0]
                : sheet.ownerNode?.getAttribute('data-plugin-css') || sheet.ownerNode?.getAttribute('data-plugin') || '<inline style>';
            try {
                scanRules(sheet.cssRules, source);
            } catch (error) {
                matchingRules.push(`${source} | таблица недоступна: ${error.name}`);
            }
        }

        output.push(`${prefix} Заголовок: ${(title.textContent || '').trim()}`);
        output.push(`${prefix} Окно браузера: ${innerWidth}x${innerHeight}`);
        output.push(`${prefix} Элементы окна и родителей:`);
        output.push(...elementRows);
        output.push(`${prefix} Совпавшие CSS-правила геометрии:`);
        output.push(...(matchingRules.length ? matchingRules : ['Совпавшие правила не найдены.']));
        console.log(output.join('\n'));
    } catch (error) {
        output.push(`${prefix} Ошибка: ${error instanceof Error ? error.message : String(error)}`);
        console.log(output.join('\n'));
    }
})();
