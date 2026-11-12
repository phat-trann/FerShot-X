// Read-only release/tag guard. No token or private signing material is printed.
const parse=value=>{const match=/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value??"");return match?match.slice(1).map(BigInt):null;};
const compare=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i]?1:-1;}return 0;};
module.exports=async({github,context,core,env=process.env})=>{
 const owner=env.RELEASE_OWNER,repo=env.RELEASE_REPO,tag=env.RELEASE_TAG,current=parse(env.RELEASE_VERSION);
 if(!current||tag!==`v${env.RELEASE_VERSION}`)throw Error("Release version/tag mismatch");
 const optional=async call=>{try{return (await call()).data;}catch(error){if(error.status===404)return null;throw error;}};
 const existing=await optional(()=>github.rest.repos.getReleaseByTag({owner,repo,tag}));
 if(existing&&!existing.draft){core.notice("Version already published; skipping immutable release");core.setOutput("publish","false");return;}
 const latest=await optional(()=>github.rest.repos.getLatestRelease({owner,repo}));const latestVersion=parse(latest?.tag_name);
 if(latestVersion&&compare(current,latestVersion)<=0){core.notice("Version does not exceed latest published release; skipping");core.setOutput("publish","false");return;}
 const reference=await optional(()=>github.rest.git.getRef({owner,repo,ref:`tags/${tag}`}));
 if(reference){let object=reference.object;for(let n=0;object.type==="tag"&&n<4;n++)object=(await github.rest.git.getTag({owner,repo,tag_sha:object.sha})).data.object;
  const expected=env.UPDATER_RELEASE_REF?(await github.rest.repos.getCommit({owner,repo,ref:env.UPDATER_RELEASE_REF})).data.sha:context.sha;
  if(object.type!=="commit"||object.sha!==expected)throw Error("Existing version tag points to a different commit. Increment the version or rerun its original workflow.");
 }
 core.setOutput("publish","true");
};
