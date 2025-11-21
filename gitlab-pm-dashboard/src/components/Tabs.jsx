import React from 'react'
import { VIEW_TABS } from '../constants/config'

export default function Tabs({ activeView, onViewChange }) {
  const handleTabClick = (tabId) => {
    console.log('📑 TAB CLICKED:', tabId)
    console.log('onViewChange type:', typeof onViewChange)
    console.log('onViewChange function:', onViewChange)
    if (typeof onViewChange === 'function') {
      onViewChange(tabId)
    } else {
      console.error('❌ onViewChange is not a function!')
    }
  }

  return (
    <div className="tabs">
      {VIEW_TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab ${activeView === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
