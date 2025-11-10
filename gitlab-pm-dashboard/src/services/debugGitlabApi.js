/**
 * Debug GitLab API Service
 * Enhanced debugging for epic fetching issues
 */

/**
 * Test epic API access with detailed debugging
 */
export async function debugEpicAccess(gitlabUrl, groupPath, token) {
  console.log('=== EPIC DEBUG TEST ===')
  console.log('Configuration:')
  console.log('  GitLab URL:', gitlabUrl)
  console.log('  Group Path:', groupPath)
  console.log('  Token:', token ? `${token.substring(0, 10)}...` : 'NOT PROVIDED')

  const results = {
    groupAccess: false,
    epicApiAvailable: false,
    epicsFound: 0,
    errors: [],
    apiResponses: []
  }

  // Step 1: Test group access
  try {
    console.log('\n1. Testing group access...')
    const encodedGroupPath = encodeURIComponent(groupPath)
    const groupUrl = `${gitlabUrl}/api/v4/groups/${encodedGroupPath}`
    console.log('   URL:', groupUrl)

    const groupResponse = await fetch(groupUrl, {
      headers: { 'PRIVATE-TOKEN': token }
    })

    console.log('   Status:', groupResponse.status)

    if (groupResponse.ok) {
      const groupData = await groupResponse.json()
      console.log('   ✓ Group found:', groupData.full_path)
      console.log('   Group ID:', groupData.id)
      console.log('   Group Name:', groupData.name)
      results.groupAccess = true
      results.groupId = groupData.id
    } else {
      const errorText = await groupResponse.text()
      console.error('   ✗ Group access failed:', errorText)
      results.errors.push(`Group access: ${groupResponse.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('   ✗ Group test error:', error.message)
    results.errors.push(`Group test: ${error.message}`)
  }

  // Step 2: Test epic API with different approaches
  if (results.groupAccess) {
    // Try 2a: Using group path
    try {
      console.log('\n2a. Testing epic API with group path...')
      const encodedGroupPath = encodeURIComponent(groupPath)
      const epicUrl = `${gitlabUrl}/api/v4/groups/${encodedGroupPath}/epics?per_page=5`
      console.log('   URL:', epicUrl)

      const epicResponse = await fetch(epicUrl, {
        headers: { 'PRIVATE-TOKEN': token }
      })

      console.log('   Status:', epicResponse.status)
      results.apiResponses.push({
        method: 'group path',
        url: epicUrl,
        status: epicResponse.status
      })

      if (epicResponse.ok) {
        const epics = await epicResponse.json()
        console.log('   ✓ Epic API accessible')
        console.log('   Epics found:', epics.length)
        if (epics.length > 0) {
          console.log('   Sample epic:', {
            id: epics[0].id,
            iid: epics[0].iid,
            title: epics[0].title,
            group_id: epics[0].group_id
          })
        }
        results.epicApiAvailable = true
        results.epicsFound = epics.length
      } else {
        const errorText = await epicResponse.text()
        console.error('   ✗ Epic API error:', errorText)
        results.errors.push(`Epic API (path): ${epicResponse.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('   ✗ Epic API test error:', error.message)
      results.errors.push(`Epic API test: ${error.message}`)
    }

    // Try 2b: Using group ID if we have it
    if (results.groupId) {
      try {
        console.log('\n2b. Testing epic API with group ID...')
        const epicUrl = `${gitlabUrl}/api/v4/groups/${results.groupId}/epics?per_page=5`
        console.log('   URL:', epicUrl)

        const epicResponse = await fetch(epicUrl, {
          headers: { 'PRIVATE-TOKEN': token }
        })

        console.log('   Status:', epicResponse.status)
        results.apiResponses.push({
          method: 'group ID',
          url: epicUrl,
          status: epicResponse.status
        })

        if (epicResponse.ok) {
          const epics = await epicResponse.json()
          console.log('   ✓ Epic API accessible via ID')
          console.log('   Epics found:', epics.length)
          results.epicsFoundViaId = epics.length
        } else {
          const errorText = await epicResponse.text()
          console.error('   ✗ Epic API error (ID):', errorText)
        }
      } catch (error) {
        console.error('   ✗ Epic API test error (ID):', error.message)
      }
    }

    // Try 2c: Test with different parameters
    try {
      console.log('\n2c. Testing epic API with different parameters...')
      const encodedGroupPath = encodeURIComponent(groupPath)
      const epicUrl = `${gitlabUrl}/api/v4/groups/${encodedGroupPath}/epics?state=opened&include_ancestor_groups=true&include_descendant_groups=true`
      console.log('   URL:', epicUrl)

      const epicResponse = await fetch(epicUrl, {
        headers: { 'PRIVATE-TOKEN': token }
      })

      console.log('   Status:', epicResponse.status)
      results.apiResponses.push({
        method: 'with parameters',
        url: epicUrl,
        status: epicResponse.status
      })

      if (epicResponse.ok) {
        const epics = await epicResponse.json()
        console.log('   ✓ Epic API with parameters')
        console.log('   Epics found:', epics.length)
        results.epicsWithParams = epics.length
      }
    } catch (error) {
      console.error('   ✗ Epic API parameter test error:', error.message)
    }
  }

  // Step 3: Test if issues have epic references
  try {
    console.log('\n3. Checking if issues reference epics...')
    const encodedProjectId = encodeURIComponent('ubs-ag/group-functions/gf-comms-branding/marketing-data-behavioural-analytics/astro/commons/astro-home')
    const issueUrl = `${gitlabUrl}/api/v4/projects/${encodedProjectId}/issues?per_page=10&with_labels_details=true`
    console.log('   URL:', issueUrl)

    const issueResponse = await fetch(issueUrl, {
      headers: { 'PRIVATE-TOKEN': token }
    })

    if (issueResponse.ok) {
      const issues = await issueResponse.json()
      const issuesWithEpics = issues.filter(i => i.epic).length
      console.log(`   Found ${issuesWithEpics}/${issues.length} issues with epic references`)

      if (issuesWithEpics > 0) {
        const sampleIssue = issues.find(i => i.epic)
        console.log('   Sample epic reference:', {
          issue_iid: sampleIssue.iid,
          epic_id: sampleIssue.epic?.id,
          epic_iid: sampleIssue.epic?.iid,
          epic_title: sampleIssue.epic?.title
        })
      }
    }
  } catch (error) {
    console.error('   ✗ Issue check error:', error.message)
  }

  // Summary
  console.log('\n=== SUMMARY ===')
  console.log('Group Access:', results.groupAccess ? '✓' : '✗')
  console.log('Epic API Available:', results.epicApiAvailable ? '✓' : '✗')
  console.log('Epics Found:', results.epicsFound)
  if (results.errors.length > 0) {
    console.log('Errors:', results.errors)
  }

  // Recommendations
  console.log('\n=== RECOMMENDATIONS ===')
  if (!results.groupAccess) {
    console.log('⚠️ Cannot access group. Check:')
    console.log('   - Group path is correct')
    console.log('   - Token has group access')
    console.log('   - GitLab URL is correct')
  } else if (!results.epicApiAvailable) {
    console.log('⚠️ Epic API not accessible. Possible causes:')
    console.log('   - GitLab instance doesn\'t have Premium/Ultimate license')
    console.log('   - Token doesn\'t have epic read permissions')
    console.log('   - Epic API is disabled for this group')
    console.log('   - Group path encoding issue')
  } else if (results.epicsFound === 0) {
    console.log('⚠️ Epic API works but no epics found. Check:')
    console.log('   - Epics exist in this group')
    console.log('   - Epics are not filtered by date')
    console.log('   - You have permission to view epics')
  }

  return results
}

/**
 * Try alternative methods to fetch epics
 */
export async function tryAlternativeEpicFetch(gitlabUrl, groupPath, token) {
  console.log('\n=== TRYING ALTERNATIVE EPIC FETCH METHODS ===')

  const results = []

  // Method 1: Try parent groups
  const pathParts = groupPath.split('/')
  for (let i = pathParts.length; i > 0; i--) {
    const testPath = pathParts.slice(0, i).join('/')
    console.log(`\nTrying group: ${testPath}`)

    try {
      const encodedPath = encodeURIComponent(testPath)
      const url = `${gitlabUrl}/api/v4/groups/${encodedPath}/epics?per_page=5`
      const response = await fetch(url, {
        headers: { 'PRIVATE-TOKEN': token }
      })

      if (response.ok) {
        const epics = await response.json()
        console.log(`  ✓ Found ${epics.length} epics`)
        results.push({
          path: testPath,
          epicCount: epics.length,
          success: true
        })
      } else {
        console.log(`  ✗ Status: ${response.status}`)
        results.push({
          path: testPath,
          status: response.status,
          success: false
        })
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`)
    }
  }

  return results
}