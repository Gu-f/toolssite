import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslation, type Translate } from '../../../i18n/LanguageContext';
import type { Tool } from '../../../types/tool';
import { TOOLS } from '../registry';
import { MAX_TAB_TITLE_LENGTH, type ToolTab } from './workspaceDatabase';

type ToolTabBarProps = {
  tabs: readonly ToolTab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onCloseTabs: (tabIds: readonly string[]) => void;
  onCloseAll: () => void;
  onCreate: () => void;
  onRename: (tabId: string, title: string) => void;
};

type TabContextMenu = {
  readonly tabId: string;
  readonly x: number;
  readonly y: number;
};

type TabTitleEditor = {
  readonly tabId: string;
  readonly value: string;
};

type TabScrollState = {
  readonly canScrollLeft: boolean;
  readonly canScrollRight: boolean;
};

const CONTEXT_MENU_WIDTH = 200;
const CONTEXT_MENU_HEIGHT = 132;
const VIEWPORT_MARGIN = 8;
const LINE_SCROLL_DELTA_PX = 16;
const TAB_SCROLL_STEP_RATIO = 0.8;
const SCROLL_POSITION_EPSILON = 1;

function getToolLabel(tool: Tool, t: Translate): string {
  return t(`tools.${tool.id}.label`);
}

function getDefaultTabTitle(tabs: readonly ToolTab[], tab: ToolTab, t: Translate): string {
  const sameToolTabs = tabs.filter((item) => item.toolId === tab.toolId);
  const sameToolIndex = sameToolTabs.findIndex((item) => item.id === tab.id) + 1;
  const tool = TOOLS.find((item) => item.id === tab.toolId);

  return `${tool ? getToolLabel(tool, t) : tab.toolId} #${sameToolIndex}`;
}

function getTabTitle(tabs: readonly ToolTab[], tab: ToolTab, t: Translate): string {
  return tab.title ?? getDefaultTabTitle(tabs, tab, t);
}

function moveTabFocus(container: HTMLElement, offset: number): void {
  const tabButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const currentIndex = tabButtons.findIndex((button) => button === document.activeElement);

  if (currentIndex < 0 || tabButtons.length === 0) {
    return;
  }

  const nextIndex = (currentIndex + offset + tabButtons.length) % tabButtons.length;
  tabButtons[nextIndex]?.focus();
}

export default function ToolTabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onCloseTabs,
  onCloseAll,
  onCreate,
  onRename,
}: ToolTabBarProps) {
  const { t } = useTranslation();
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [titleEditor, setTitleEditor] = useState<TabTitleEditor | null>(null);
  const [contextMenu, setContextMenu] = useState<TabContextMenu | null>(null);
  const [scrollState, setScrollState] = useState<TabScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeTool = activeTab
    ? TOOLS.find((tool) => tool.id === activeTab.toolId)
    : undefined;
  const newTabLabel = activeTool
    ? t('tab.newToolTabWithName', { tool: getToolLabel(activeTool, t) })
    : t('tab.newToolTab');
  const contextTab = contextMenu
    ? tabs.find((tab) => tab.id === contextMenu.tabId) ?? null
    : null;
  const contextTabIndex = contextTab ? tabs.indexOf(contextTab) : -1;
  const rightTabIds = contextTabIndex >= 0
    ? tabs.slice(contextTabIndex + 1).map((tab) => tab.id)
    : [];
  const leftTabIds = contextTabIndex > 0
    ? tabs.slice(0, contextTabIndex).map((tab) => tab.id)
    : [];

  useEffect(() => {
    const tabList = tabListRef.current;

    if (!tabList) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      let delta = event.deltaX;

      if (delta === 0) {
        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
          delta = event.deltaY * LINE_SCROLL_DELTA_PX;
        } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
          delta = event.deltaY * tabList.clientWidth;
        } else {
          delta = event.deltaY;
        }
      }

      const maxScrollLeft = tabList.scrollWidth - tabList.clientWidth;

      if (delta === 0 || maxScrollLeft <= 0) {
        return;
      }

      const nextScrollLeft = Math.min(
        maxScrollLeft,
        Math.max(0, tabList.scrollLeft + delta),
      );

      if (nextScrollLeft === tabList.scrollLeft) {
        return;
      }

      tabList.scrollLeft = nextScrollLeft;
      event.preventDefault();
    };

    tabList.addEventListener('wheel', handleWheel, { passive: false });

    return () => tabList.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const tabList = tabListRef.current;

    if (!tabList) {
      return;
    }

    const updateScrollState = () => {
      const maxScrollLeft = tabList.scrollWidth - tabList.clientWidth;
      const nextScrollState: TabScrollState = {
        canScrollLeft: tabList.scrollLeft > SCROLL_POSITION_EPSILON,
        canScrollRight: maxScrollLeft - tabList.scrollLeft > SCROLL_POSITION_EPSILON,
      };

      setScrollState((currentState) => (
        currentState.canScrollLeft === nextScrollState.canScrollLeft
        && currentState.canScrollRight === nextScrollState.canScrollRight
          ? currentState
          : nextScrollState
      ));
    };

    // ResizeObserver reports the initial availability without a synchronous
    // state update during the effect, and keeps buttons in sync while tabs resize.
    const resizeObserver = new ResizeObserver(updateScrollState);

    resizeObserver.observe(tabList);
    Array.from(tabList.children).forEach((child) => resizeObserver.observe(child));
    tabList.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      tabList.removeEventListener('scroll', updateScrollState);
    };
  }, [tabs]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeMenu = () => setContextMenu(null);
    const handlePointerDown = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('blur', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('blur', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [contextMenu]);

  const openContextMenu = (event: MouseEvent<HTMLElement>, tabId: string) => {
    event.preventDefault();
    setContextMenu({
      tabId,
      x: Math.max(
        VIEWPORT_MARGIN,
        Math.min(event.clientX, window.innerWidth - CONTEXT_MENU_WIDTH - VIEWPORT_MARGIN),
      ),
      y: Math.max(
        VIEWPORT_MARGIN,
        Math.min(event.clientY, window.innerHeight - CONTEXT_MENU_HEIGHT - VIEWPORT_MARGIN),
      ),
    });
  };

  const startRename = (tab: ToolTab) => {
    setTitleEditor({
      tabId: tab.id,
      value: getTabTitle(tabs, tab, t),
    });
  };

  const commitTitle = () => {
    if (!titleEditor) {
      return;
    }

    const nextTitle = titleEditor.value.trim().slice(0, MAX_TAB_TITLE_LENGTH);
    const editingTab = tabs.find((tab) => tab.id === titleEditor.tabId);

    setTitleEditor(null);

    if (editingTab && nextTitle !== getTabTitle(tabs, editingTab, t)) {
      onRename(titleEditor.tabId, nextTitle);
    }
  };

  const handleTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTabFocus(event.currentTarget, 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTabFocus(event.currentTarget, -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      event.currentTarget.querySelector<HTMLButtonElement>('[role="tab"]')?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      event.currentTarget
        .querySelectorAll<HTMLButtonElement>('[role="tab"]')
        .item(-1)
        ?.focus();
    }
  };

  const scrollTabs = (direction: -1 | 1) => {
    const tabList = tabListRef.current;

    if (!tabList) {
      return;
    }

    const maxScrollLeft = tabList.scrollWidth - tabList.clientWidth;
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(
        0,
        tabList.scrollLeft + direction * tabList.clientWidth * TAB_SCROLL_STEP_RATIO,
      ),
    );

    tabList.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
  };

  return (
    <div className="tool-tab-bar">
      <button
        type="button"
        className="tool-tab-scroll-button"
        aria-label={t('tab.scrollLeft')}
        title={t('tab.scrollLeft')}
        disabled={!scrollState.canScrollLeft}
        onClick={() => scrollTabs(-1)}
      >
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
        >
          <path
            d="M6.5 1.5L3 5l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        ref={tabListRef}
        className="tool-tab-list"
        role="tablist"
        aria-label={t('tab.openLabel')}
        onKeyDown={handleTabListKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = titleEditor?.tabId === tab.id;
          const title = getTabTitle(tabs, tab, t);

          return (
            <div
              key={tab.id}
              role="presentation"
              className={`tool-tab${isActive ? ' is-active' : ''}${isEditing ? ' is-editing' : ''}`}
              onContextMenu={(event) => openContextMenu(event, tab.id)}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="tool-tab-title-input"
                  value={titleEditor.value}
                  maxLength={MAX_TAB_TITLE_LENGTH}
                  aria-label={t('tab.titleFor', { title: getDefaultTabTitle(tabs, tab, t) })}
                  onChange={(event) => setTitleEditor((current) => current && {
                    ...current,
                    value: event.target.value,
                  })}
                  onBlur={commitTitle}
                  onKeyDown={(event) => {
                    event.stopPropagation();

                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitTitle();
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      setTitleEditor(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  id={`tool-tab-${tab.id}`}
                  role="tab"
                  className="tool-tab-button"
                  aria-selected={isActive}
                  aria-controls="tool-tab-panel"
                  tabIndex={isActive ? 0 : -1}
                  title={title}
                  onClick={() => onSelect(tab.id)}
                  onDoubleClick={() => startRename(tab)}
                >
                  <span>{title}</span>
                </button>
              )}
              <button
                type="button"
                className="tool-tab-action"
                aria-label={t('tab.rename', { title })}
                title={t('tab.renameTab')}
                onClick={(event) => {
                  event.stopPropagation();
                  startRename(tab);
                }}
              >
                <svg
                  aria-hidden="true"
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  fill="none"
                >
                  <path
                    d="M6.7 1.3l2 2L4 8H2V6l4.7-4.7z"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {tabs.length > 1 && (
                <button
                  type="button"
                  className="tool-tab-close"
                  aria-label={t('tab.close', { title })}
                  onClick={() => onClose(tab.id)}
                >
                  <svg
                    aria-hidden="true"
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="none"
                  >
                    <path
                      d="M1.5 1.5l5 5m0-5l-5 5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="tool-tab-scroll-button"
        aria-label={t('tab.scrollRight')}
        title={t('tab.scrollRight')}
        disabled={!scrollState.canScrollRight}
        onClick={() => scrollTabs(1)}
      >
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
        >
          <path
            d="M3.5 1.5L7 5l-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        className="tool-tab-add"
        aria-label={newTabLabel}
        onClick={onCreate}
      >
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
        >
          <path
            d="M5 1.5v7M1.5 5h7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        {t('tab.newTab')}
      </button>
      {contextTab && contextMenu && (
        <div
          ref={contextMenuRef}
          className="tool-tab-context-menu"
          role="menu"
          aria-label={t('tab.actionsFor', { title: getTabTitle(tabs, contextTab, t) })}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            role="menuitem"
            className="tool-tab-context-item"
            disabled={rightTabIds.length === 0}
            autoFocus={rightTabIds.length > 0}
            onClick={() => {
              onCloseTabs(rightTabIds);
              setContextMenu(null);
            }}
          >
            {t('tab.closeRight')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="tool-tab-context-item"
            disabled={leftTabIds.length === 0}
            autoFocus={rightTabIds.length === 0 && leftTabIds.length > 0}
            onClick={() => {
              onCloseTabs(leftTabIds);
              setContextMenu(null);
            }}
          >
            {t('tab.closeLeft')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="tool-tab-context-item"
            autoFocus={rightTabIds.length === 0 && leftTabIds.length === 0}
            onClick={() => {
              onCloseAll();
              setContextMenu(null);
            }}
          >
            {t('tab.closeAll')}
          </button>
        </div>
      )}
    </div>
  );
}
