import React from 'react'
import { VIEW_TABS } from '../constants/config'

export default function Tabs({ activeView, onViewChange }) {
  return (
    <div className="tabs">
      {VIEW_TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab ${activeView === tab.id ? 'active' : ''}`}
          onClick={() => onViewChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
