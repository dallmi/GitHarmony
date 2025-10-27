import React from 'react'

export default function HealthCircle({ score, status }) {
  const className = status === 'green' ? 'health-good' :
                    status === 'amber' ? 'health-warning' :
                    'health-danger'

  return (
    <div className={`health-circle ${className}`}>
      {score}
    </div>
  )
}
